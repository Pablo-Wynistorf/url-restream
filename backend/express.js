const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || API_URL.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

if (process.env.VCAP_SERVICES) {
  const services = JSON.parse(process.env.VCAP_SERVICES);
  if (Object.keys(services).length !== 0) {
    const cd = services["mongodbent"][0].credentials;
    process.env.DATABASE_URI = cd.database_uri;
  }
}

const API_URL = process.env.API_URL;
const DATABASE_URI = process.env.DATABASE_URI;

function connectToDatabase() {
  mongoose.connect(DATABASE_URI);
}

connectToDatabase();

const db = mongoose.connection;

db.on('error', () => {
  console.log('MongoDB connection error. Reconnecting...');
  setTimeout(connectToDatabase, 5000);

});
db.on('disconnected', () => {
  console.log('MongoDB disconnected. Reconnecting...');
  connectToDatabase();
});

db.on('econnrefused', () => {
  console.log('MongoDB connection refused. Reconnecting...');
  setTimeout(connectToDatabase, 5000);
});

db.once('open', () => {
  console.log('Connected to MongoDB');
});

const { Schema } = mongoose;
const urlSchema = new Schema({
  link: String,
  randomString: String,
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

app.post('/api/link', async (req, res) => {
  const { link } = req.body;

  const validatedLink = link.startsWith('http://') || link.startsWith('https://') ? link : `https://${link}`;

  if (!validateURL(validatedLink)) {
    return res.status(400).json({ success: false });
  }

  try {
    const existingUser = await urlDB.findOne({ link: validatedLink });

    if (existingUser) {
      return res.status(200).json({ success: true, shortenedLink: `${API_URL}/${existingUser.randomString}` });
    }

    const randomString = crypto.randomBytes(3).toString('hex').slice(0, 6);

    const newUser = await urlDB.findOneAndUpdate(
      { randomString },
      { $setOnInsert: { link: validatedLink, randomString } },
      { upsert: true, new: true }
    );

    const shortenedLink = `${API_URL}/${newUser.randomString}`;
    res.status(200).json({ success: true, shortenedLink });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong, try again later' });
  }
});

app.all('/:refCode', async (req, res) => {
  const { refCode } = req.params;

  try {
    const urlDoc = await urlDB.findOne({ randomString: refCode });

    if (urlDoc && urlDoc.link) {
      const url = new URL(urlDoc.link);
      res.redirect(url.href);
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong, try again later' });
  }
});

app.listen(3000, () => {
  console.log('Login API started on port 3000');
});
