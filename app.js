if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');

const sanitizeV5 = require('./utils/mongoSanitizeV5.js');

const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');

const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');

// 'mongodb://localhost:27017/yelp-camp'
const dbUrl = process.env.DB_URL;
mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

// Handle MongoDB connection errors gracefully
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});


const app = express();

app.set('query parser', 'extended');


app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))


const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: process.env.SESSION_SECRET
    }
});

store.on('error', (e) => {
    console.log("SESSION STORE ERROR", e);
})

const sessionOptions = {
    store,
    name: 'session',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,

    }
}
app.use(session(sessionOptions));
app.use(flash());
app.use(helmet({
    // MapTiler spawns web workers via blob: URLs; disable COEP and allow workers
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Allow scripts from self, MapTiler SDK, and Bootstrap CDN
            scriptSrc: [
                "'self'",
                "https://cdn.maptiler.com",
                "https://cdn.jsdelivr.net"
            ],
            // Allow web workers (MapTiler uses blob workers)
            workerSrc: [
                "'self'",
                "blob:"
            ],
            // Allow connections to MapTiler APIs for styles/tiles
            connectSrc: [
                "'self'",
                "https://api.maptiler.com",
                // Allow fetching source maps and other resources from jsDelivr when DevTools are open
                "https://cdn.jsdelivr.net"
            ],
            // Allow styles from self, MapTiler, Bootstrap; include inline for EJS/Bootstrap utilities
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.maptiler.com",
                "https://cdn.jsdelivr.net"
            ],
            // Allow images from self, data URLs, blob URLs, and Cloudinary
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://res.cloudinary.com",
                "https://api.maptiler.com",
                "https://*.maptiler.com",
                // Allow Unsplash-hosted images
                "https://images.unsplash.com",
                "https://*.unsplash.com"
            ],
            // Allow fonts from self and CDN
            fontSrc: [
                "'self'",
                "https://cdn.jsdelivr.net",
                "data:"
            ],
            // Disallow any other sources for objects
            objectSrc: ["'none'"]
        }
    }
}));

app.use(passport.initialize());
app.use(passport.session());
// app.use(mongoSanitize());
app.use(sanitizeV5({ replaceWith: '_' }));
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success') || [];
    res.locals.error = req.flash('error') || [];
    next();
})

app.use('/campgrounds', campgroundRoutes)
app.use('/campgrounds/:id/reviews', reviewRoutes)
app.use('/', userRoutes)

app.get('/', (req, res) => {
    res.render('home', { layout: false })
});


app.all(/(.*)/, (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})


app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Internal Server Error';
    res.status(statusCode).render('error', { err });
})

app.listen(3000, () => {
    console.log('Server is running on port 3000');
})