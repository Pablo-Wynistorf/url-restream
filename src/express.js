const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json());

if (process.env.VCAP_SERVICES) {
  const services = JSON.parse(process.env.VCAP_SERVICES);
  if (Object.keys(services).length !== 0) {
    const cd = services["mongodbent"][0].credentials;
    process.env.DATABASE_URI = cd.database_uri;
  }
}

const API_PORT = process.env.API_PORT || 80;
const DATABASE_URI = process.env.DATABASE_URI;

function connectToDatabase() {
  mongoose.connect(DATABASE_URI);
}
const db = mongoose.connection;

connectToDatabase();

db.on('error', () => {
  console.log('MongoDB connection error. Reconnecting...');
  setTimeout(connectToDatabase, 5000);
});

db.on('disconnected', () => {
  console.log('MongoDB disconnected. Reconnecting...');
  setTimeout(connectToDatabase, 5000);
  return;
});

db.on('connected', () => {
  console.log('Connected to MongoDB');
});

const { Schema } = mongoose;
const urlSchema = new Schema({
  urlId: String,
  otuUrlId: String,
  link: String,
  timestamp: String,
});

const urlDB = mongoose.model('urldb', urlSchema);

app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    connectToDatabase();
  }
  next();
});


app.use(express.static(path.join(__dirname, 'public')));



const validateUrl = (url) => {
  const CustomUrlId = /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/;
  return CustomUrlId.test(url);
};

const validateCustomUrlId = (url) => {
  const CustomUrlId = /^[a-zA-Z0-9]+$/;
  return CustomUrlId.test(url);
};


async function generateOtuString() {
  let randomString;
  let existingString;

  do {
    randomString = crypto.randomBytes(30).toString('hex');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timed out')), 5000)
    );

    try {
      existingString = await Promise.race([
        urlDB.findOne({ otuUrlId: randomString }),
        timeoutPromise,
      ]);
    } catch (error) {
      console.error(error.message);
    }
  } while (existingString);
  return randomString;
}


async function generateUniqueRandomString() {
  let randomString;
  let existingString;
  do {
    randomString = crypto.randomBytes(3).toString('hex').slice(0, 6);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timed out')), 5000)
    );

    existingString = await Promise.race([
      urlDB.findOne({ urlId: randomString }),
      timeoutPromise,
    ]);
  } while (existingString);
  return randomString;
}

async function getTimestamp() {
  return Date.now();
}


app.post('/api/link', async (req, res) => {
  const { link, customUrlId, otu } = req.body;
  const { origin: host } = req.headers;

  const validatedLink = link.startsWith('http://') || link.startsWith('https://') ? link : `https://${link}`;

  if (!validateUrl(validatedLink)) {
    return res.status(400).json({ success: false, error: 'Invalid url provided' });
  }

  try {
    if (otu === true) {
      const timestamp = await getTimestamp();

      const timeoutPromiseRandomString = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query in generateUniqueRandomString timed out')), 5000)
      );

      const urlIdToInsert = await Promise.race([
        generateOtuString(),
        timeoutPromiseRandomString,
      ]);

      const timeoutPromiseInsertMany = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database insertMany timed out')), 5000)
      );

      await Promise.race([
        urlDB.insertMany({ urlId: '', otuUrlId: urlIdToInsert, link: validatedLink, timestamp: timestamp }),
        timeoutPromiseInsertMany,
      ]);

      const shortenedLink = `${host}/otu/${urlIdToInsert}`;
      return res.status(200).json({ success: true, shortenedLink });
    }

    let urlIdToInsert;

    if (customUrlId) {
      if (!validateCustomUrlId(customUrlId)) {
        return res.status(401).json({ success: false, error: 'Invalid custom urlId' });
      }

      const timeoutPromiseCustomUrl = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query for customUrlId timed out')), 5000)
      );

      const existingCustomLinkPromise = urlDB.findOne({ urlId: customUrlId });

      const existingCustomLink = await Promise.race([
        existingCustomLinkPromise,
        timeoutPromiseCustomUrl,
      ]);

      if (existingCustomLink) {
        return res.status(402).json({ error: 'Custom URL already in use' });
      }

      urlIdToInsert = customUrlId;
    } else {
      const timeoutPromiseRandomString = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query in generateUniqueRandomString timed out')), 5000)
      );

      urlIdToInsert = await Promise.race([
        generateUniqueRandomString(),
        timeoutPromiseRandomString,
      ]);
    }

    const timestamp = await getTimestamp();

    const timeoutPromiseInsertMany = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database insertMany timed out')), 5000)
    );

    await Promise.race([
      urlDB.insertMany({ urlId: urlIdToInsert, otuUrlId: '', link: validatedLink, timestamp: timestamp }),
      timeoutPromiseInsertMany,
    ]);

    const shortenedLink = `${host}/${urlIdToInsert}`;
    return res.status(200).json({ success: true, shortenedLink });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});





app.all('/:urlId', async (req, res) => {
  const { urlId } = req.params;

  try {
    const urlDocPromise = new Promise(async (resolve, reject) => {
      try {
        const urlDoc = await urlDB.findOne({ urlId: urlId });
        resolve(urlDoc);
      } catch (error) {
        reject(error);
      }
    });

    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => reject('Database query timed out'), 5000);
    });

    try {
      const urlDoc = await Promise.race([urlDocPromise, timeoutPromise]);

      if (urlDoc && urlDoc.link) {
        const url = new URL(urlDoc.link);
        res.redirect(url.href);
      } else {
        return res.redirect('/');
      }
    } catch (error) {
      return res.redirect('/');
    }
  } catch (error) {
    return res.redirect('/');
  }
});


app.all('/otu/:otuUrlId', async (req, res) => {
  const { otuUrlId } = req.params;

  try {
    const urlDocPromise = new Promise(async (resolve, reject) => {
      try {
        const urlDoc = await urlDB.findOne({ otuUrlId: otuUrlId });
        resolve(urlDoc);
      } catch (error) {
        reject(error);
      }
    });

    const timeoutPromise = new Promise((resolve, reject) => {
      setTimeout(() => reject('Database query timed out'), 5000);
    });

    try {
      const urlDoc = await Promise.race([urlDocPromise, timeoutPromise]);

      if (urlDoc && urlDoc.link) {
        await urlDB.deleteOne({ otuUrlId: otuUrlId });

        const url = new URL(urlDoc.link);
        res.redirect(url.href);
      } else {
        return res.redirect('/');
      }
    } catch (error) {
      return res.redirect('/');
    }
  } catch (error) {
    return res.redirect('/');
  }
});




app.listen(API_PORT, () => {
  console.log(`URL Shortener started on port ${API_PORT}`);
});
