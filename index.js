const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.nt7otjy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const summerCampSchoolDB = client.db("summer_camp_school");
        const userCollection = summerCampSchoolDB.collection("users");


        // user login info api
        app.post('/login-user', async (req, res) => {
            const userInfo = req.body;
            console.log(userInfo);
            const userEmail = { email: userInfo.email };
            const existingUser = await userCollection.findOne(userEmail);
            console.log(existingUser);
            if (existingUser) {
                return res.send({ message: 'user already exists' });
            }
            const result = await userCollection.insertOne(userInfo);
            res.send(result);
        });

        // 

        // manage user api
        app.get('/manage-user', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        // manage user role update api
        // make student to admin
        app.patch('/manage-user/update-role-admin/:userId', async (req, res) => {
            const userId = req.params.userId;
            console.log(userId);
            const filter = { _id: new ObjectId(userId) }
            const options = { upsert: true };
            const updateUserRole = {
                $set: {
                    role: 'admin',
                },
            };
            const result = await userCollection.updateOne(filter, updateUserRole, options);
            res.send(result);
        });

        // make student to instructor
        app.patch('/manage-user/update-role-instructor/:userId', async (req, res) => {
            const userId = req.params.userId;
            console.log(userId);
            const filter = { _id: new ObjectId(userId) }
            const options = { upsert: true };
            const updateUserRole = {
                $set: {
                    role: 'instructor',
                },
            };
            const result = await userCollection.updateOne(filter, updateUserRole, options);
            res.send(result);
        });

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Summer camp school server is running');
});

app.listen(port, () => {
    console.log(`Summer camp school server is running on port ${port}`);
});