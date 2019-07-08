'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const session     = require('express-session');
const passport    = require('passport');
const ObjectID = require('mongodb').ObjectID;
const mongo = require('mongodb').MongoClient;
const LocalStrategy = require('passport-local');
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
            if (password !== user.password) { return done(null, false); }
            return done(null, user);
        });
      }
    ));
      
    app.route('/')
    .get((req, res) => {
      res.render(
        process.cwd() + '/views/pug/index', 
        {title: 'Hello', message: 'login', showLogin: true, showRegistration: true}
      );
    });
      
    app.route('/login')
    .post(passport.authenticate('local', { failureRedirect: '/' }),(req,res) => {
               res.redirect('/profile');
    });
    
    app.route('/profile')
      .get(ensureAuthenticated, (req,res) => {
           res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
    });
      
    app.route('/register')
    .post((req, res, next) => {
        db.collection('users').findOne({ username: req.body.username }, function (err, user) {
            if(err) {
                next(err);
            } else if (user) {
                res.redirect('/');
            } else {
                db.collection('users').insertOne(
                  {username: req.body.username,
                   password: req.body.password},
                  (err, doc) => {
                      if(err) {
                          res.redirect('/');
                      } else {
                          next(null, user);
                      }
                  }
                )
            }
        })},
      passport.authenticate('local', {
        successRedirect: '/profile',
        failureRedirect: '/'
      })
  );

    app.route('/logout')
      .get((req, res) => {
          req.logout();
          res.redirect('/');
    });
      
    app.use((req, res, next) => {
      res.status(404)
        .type('text')
        .send('Not Found');
    });
  }
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/');
};

app.listen(process.env.PORT || 3000, () => {
  console.log("Listening on port " + process.env.PORT);
});
