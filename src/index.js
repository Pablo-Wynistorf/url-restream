const express = require('express');
const serverless = require('serverless-http');
const { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const AWS_REGION = process.env.AWS_REGION;
const TABLE_NAME = process.env.TABLE_NAME;

const app = express();
const client = new DynamoDBClient({ region: AWS_REGION });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const validateUrl = (url) => {
  const CustomUrlId = /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/;
  return CustomUrlId.test(url);
};

const validateCustomUrlId = (url) => {
  const CustomUrlId = /^[a-zA-Z0-9]+$/;
  return CustomUrlId.test(url);
};

const generateUniqueRandomOtuString = async () => {
  let randomString;
  do {
    randomString = crypto.randomBytes(30).toString('hex');
    try {
      const command = new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { urlId: { S: randomString } }
      });
      const response = await client.send(command);
      if (!response.Item) return randomString;
    } catch (error) {
      throw new Error("Error generating OTU string");
    }
  } while (true);
};

const generateUniqueRandomString = async () => {
  let randomString;
  do {
    randomString = crypto.randomBytes(3).toString('hex').slice(0, 6);
    try {
      const command = new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { urlId: { S: randomString } }
      });
      const response = await client.send(command);
      if (!response.Item) return randomString;
    } catch (error) {
      throw new Error("Error generating unique string");
    }
  } while (true);
};

const getTimestamp = () => {
  return Date.now();
};

app.post('/api/link', async (req, res) => {
  const { link, customUrlId, otu } = req.body;
  const host = req.get('host');
  const requesterIp = req.ip;

  const validatedLink = link.startsWith('http://') || link.startsWith('https://') ? link : `https://${link}`;

  if (!validateUrl(validatedLink)) {
    return res.status(400).json({ success: false, error: 'Invalid URL provided' });
  }

  try {
    if (otu === true) {
      const timestamp = await getTimestamp();
      const randomString = await generateUniqueRandomOtuString();
      const command = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          urlId: { S: randomString },
          link: { S: validatedLink },
          timestamp: { N: timestamp.toString() },
          ip: { S: requesterIp },
          otu: { BOOL: true },
        }
      });
      await client.send(command);
      const shortenedLink = `${host}/${randomString}`;
      return res.status(200).json({ success: true, shortenedLink });
    } else {
      let urlIdToInsert;
      if (customUrlId) {
        if (!validateCustomUrlId(customUrlId)) {
          return res.status(401).json({ success: false, error: 'Invalid custom urlId' });
        }

        const command = new GetItemCommand({
          TableName: TABLE_NAME,
          Key: { urlId: { S: customUrlId } }
        });
        const response = await client.send(command);
        if (response.Item) {
          return res.status(402).json({ success: false, error: 'Custom URL already in use' });
        }
        urlIdToInsert = customUrlId;
      } else {
        urlIdToInsert = await generateUniqueRandomString();
      }

      const timestamp = await getTimestamp();
      const command = new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          urlId: { S: urlIdToInsert },
          link: { S: validatedLink },
          timestamp: { N: timestamp.toString() },
          ip: { S: requesterIp },
          otu: { BOOL: false },
        }
      });
      await client.send(command);
      const shortenedLink = `${host}/${urlIdToInsert}`;
      return res.status(200).json({ success: true, shortenedLink });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/:urlId', async (req, res) => {
  const urlId = req.params.urlId;

  try {
    const command = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { urlId: { S: urlId } }
    });
    const response = await client.send(command);

    if (response.Item && response.Item.link && response.Item.link.S) {
      if (response.Item.otu.BOOL) {
        const deleteCommand = new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: { urlId: { S: urlId } }
        });
        await client.send(deleteCommand);
      }
      return res.redirect(response.Item.link.S);
    } else {
      return res.redirect('/');
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports.handler = serverless(app);
