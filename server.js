'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const session     = require('express-session');
const passport    = require('passport');
const ObjectID = require('mongodb').ObjectID;
const mongo = require('mongodb').MongoClient;
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');

const routes = require('./routes.js');
const auth = require('./auth.js');

process.env.SESSION_SECRET = 14;
process.env.ENABLE_DELAYS = true;

const app = express();

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine','pug');


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
   done(null, user._id);
 });

/* lucasMontenegro solution to pass fcc tests, thank you!! */
if (process.env.ENABLE_DELAYS) app.use((req, res, next) => {
  switch (req.method) {
    case 'GET':
      switch (req.url) {
        case '/logout': return setTimeout(() => next(), 500);
        case '/profile': return setTimeout(() => next(), 700);
        default: next();
      }
    break;
    case 'POST':
      switch (req.url) {
        case '/login': return setTimeout(() => next(), 900);
        default: next();
      }
    break;
    default: next();
  }
});
/***/

process.env.DATABASE = "mongodb+srv://admin:rbcc@cluster0-go8yi.mongodb.net/test?retryWrites=true";
mongo.connect(process.env.DATABASE, {useNewUrlParser: true}, (err, client) => {
    let db = client.db('myproject');
    auth(app, db);
  
    if(err) {
        console.log('Database error: ' + err);
    } else {
        console.log('Successful database connection');
      
      passport.deserializeUser((id, done) => {
        db.collection('users').findOne(
            {_id: new ObjectID(id)},
            (err, doc) => {
                done(null, doc);
            }
        );
      });

      passport.use(new LocalStrategy(
        function(username, password, done) {
          db.collection('users').findOne({ username: username }, function (err, user) {
            console.log('User '+ username +' attempted to log in.');
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            if (!bcrypt.compareSync(password, user.password)) { return done(null, false); }
            return done(null, user);
        });
      }
    ));
      
    routes(app, db);
  }
});


app.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + process.env.PORT);
});
