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


const validateURL = (url) => {
  const urlRegex = /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/;
  return urlRegex.test(url);
};

async function generateUniqueRandomString() {
  let randomString;
  let existingString;
  do {
    randomString = crypto.randomBytes(3).toString('hex').slice(0, 6);
    existingString = await urlDB.findOne({ urlId: randomString });
  } while (existingString);

  return randomString;
}

async function getTimestamp() {
  return Date.now();
}


app.post('/api/link', async (req, res) => {
  const { link } = req.body;
  const { customUrlId } = req.body;
  const { origin: host } = req.headers;

  const validatedLink = link.startsWith('http://') || link.startsWith('https://') ? link : `https://${link}`;

  if (!validateURL(validatedLink)) {
    return res.status(400).json({ success: false });
  }

    if (customUrlId) {
      try {
        const existingCustomLink = await urlDB.findOne({ urlId: customUrlId });

        if (existingCustomLink) {
          return res.status(401).json({ error: 'Custom URL already in use' });
        }
      } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
      }
    }
    try {
      const urlIdToInsert = customUrlId || await generateUniqueRandomString();
      const timestamp = await getTimestamp();
      await urlDB.insertMany({ urlId: urlIdToInsert, link: validatedLink, timestamp: timestamp });

      const shortenedLink = `${host}/${urlIdToInsert}`;
      res.status(200).json({ success: true, shortenedLink });
      return;
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



app.listen(3000, () => {
  console.log('URL Shortener started on port 3000');
  console.log('Connecting to MongoDB...');
});
