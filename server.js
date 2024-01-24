const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const port = 3000;

const cors = require('cors');
app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MongoDB connection URI (replace with your actual MongoDB connection string)
const mongoURI = 'mongodb://localhost:27017/regdb';

// Function to save user data to MongoDB
async function saveUserToDatabase(userData) {
    try {
        const client = await MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db();
        const usersCollection = db.collection('users');

        // Insert user data into the 'users' collection
        const result = await usersCollection.insertOne(userData);

        console.log(`User inserted with _id: ${result.insertedId}, ActivationToken: ${userData.activationToken}`);
        client.close();
    } catch (error) {
        console.error('Error saving user to database:', error.message);
    }
}

// Function to send activation email using Nodemailer
async function sendActivationEmail(email, name, activationLink, token) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: '200701506@rajalakshmi.edu.in', // replace with your Gmail email
                pass: 'J7907131969N@'   // replace with your Gmail password
            }
        });

        const mailOptions = {
            from: '200701506@rajalakshmi.edu.in',
            to: email,
            subject: 'Account Activation',
            text: `Hello ${name},\n\nThank you for registering. Please click on the following link to activate your account:\n\n${activationLink}\n\nYour temporary password for login is: ${token}\n\nRegards,\nYour Website Team`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Activation email sent:', info.response);
    } catch (error) {
        console.error('Error sending activation email:', error.message);
    }
}

// Function to generate a unique activation link
function generateActivationLink(email, token) {
    const baseURL = 'http://localhost:3000/activate?token=';
    return `${baseURL}${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

// Function to check if the user is already registered and not verified
async function isUserRegisteredAndNotVerified(email) {
    const client = await MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = client.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email, status: { $ne: 'activated' } });

    client.close();

    return user !== null;
}

// Add the following route to handle user registration and activation email sending
app.post('/register', async (req, res) => {
    const userData = req.body;

    // Check if the user is already registered and not verified
    const isUserNotVerified = await isUserRegisteredAndNotVerified(userData.email);

    if (isUserNotVerified) {
        // User is already registered but not verified, show notification
        res.status(400).json({ message: 'User is already registered but not verified.' });
    } else {
        // User is not registered or already verified, proceed with registration

        // Generate a random token for login
        const loginToken = crypto.randomBytes(8).toString('hex');
        
        // Generate a random token for activation
        const activationToken = crypto.randomBytes(16).toString('hex');

        // Assign the generated tokens to the user data
        userData.activationToken = activationToken;
        userData.loginToken = loginToken;

        // Save user data to the database
        saveUserToDatabase(userData);

        // Generate activation link
        const activationLink = generateActivationLink(userData.email, userData.activationToken);

        // Send activation email with login token
        await sendActivationEmail(userData.email, userData.name, activationLink, userData.loginToken);

        // Redirect to login page with a success message
        res.json({ message: 'New user registered successfully. Activation email sent.' });
    }
});

// Add a route to handle user activation
app.get('/activate', async (req, res) => {
    const { token, email } = req.query;

    try {
        const client = await MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db();
        const usersCollection = db.collection('users');

        // Check if the user with the given email and token exists
        const user = await usersCollection.findOne({ email, activationToken: token });

        if (user) {
            if (user.status === 'activated') {
                // User is already activated, show a message accordingly
                res.send(`<html><body><p>Account already verified. Please <a href="/login">login</a>.</p></body></html>`);
            } else {
                // Update the user status to activated
                await usersCollection.updateOne({ _id: user._id }, { $set: { status: 'activated' } });

                // Display a success message
                res.send(`<html><body><p>Welcome ${user.name}! Your account has been verified successfully. You can now <a href="/login">login</a>.</p></body></html>`);
            }
        } else {
            // Redirect to login page with an error message
            res.send(`<html><body><p style="color: red;">Invalid activation link. User not found.</p></body></html>`);
        }

        client.close();
    } catch (error) {
        console.error('Error activating user:', error.message);
        // Redirect to login page with an error message
        res.send(`<html><body><p style="color: red;">Internal Server Error</p></body></html>`);
    }
});

// Add a route to handle user login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const client = await MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db();
        const usersCollection = db.collection('users');

        // Check if the user with the given email, login token, and activated status exists
        const user = await usersCollection.findOne({ email, loginToken: password, status: 'activated' });

        if (user) {
            // Redirect to welcome page with the user's name
            res.json({ message: `Welcome ${user.name}` });
        } else {
            // Redirect to login page with an error message
            res.status(400).json({ error: 'Invalid login credentials.' });
        }

        client.close();
    } catch (error) {
        console.error('Error during login:', error.message);
        // Redirect to login page with an error message
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add the following route to handle user registration status check
app.post('/check-registration', async (req, res) => {
    const { email } = req.body;

    // Check if the user is already registered and not verified
    const isUserNotVerified = await isUserRegisteredAndNotVerified(email);

    res.json({ isUserNotVerified });
});

// Add this line before defining routes
app.use(express.static(__dirname));

// Now define your routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Define a welcome route
app.get('/welcome', (req, res) => {
    const { name } = req.query;
    res.send(`Welcome ${name}`);
});

// Define a login route
app.get('/login', (req, res) => {
    const { message, error } = req.query;
    res.send(`
        <html>
            <body>
                ${message ? `<p>${message}</p>` : ''}
                ${error ? `<p style="color: red;">${error}</p>` : ''}
                <form action="/login" method="post">
                    <label>Email: <input type="text" name="email" required></label><br>
                    <label>Password: <input type="password" name="password" required></label><br>
                    <button type="submit">Login</button>
                </form>
            </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
