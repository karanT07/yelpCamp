const mongoose = require('mongoose');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campground');

mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const sample = array => array[Math.floor(Math.random() * array.length)];


const seedDB = async () => {
    await Campground.deleteMany({});
    for (let i = 0; i < 300; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 20) + 10;
        const camp = new Campground({
            author: '68a73f6b436c143994b881ca',
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            description: ' Lorem ipsum dolor, sit amet consectetur adipisicing elit. Vero ullam, doloribus quos maiores assumenda dolorum animi accusantium facere, quisquam odio dicta laudantium eligendi. Excepturi, laboriosam aperiam dolore ad illum eum?',
            price,
            geometry:{
                type: 'Point',
                coordinates: [cities[random1000].longitude, cities[random1000].latitude]
            },
            images: [
                {
                    url: 'https://res.cloudinary.com/dugafolvh/image/upload/v1756315168/YelpCamp/xnn866hs4itoxzhiu2hi.png',
                    filename: 'YelpCamp/xnn866hs4itoxzhiu2hi',
                }
            ]
        })
        await camp.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})

// image: `https://picsum.photos/400?random=${Math.random()}`