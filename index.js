const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require("stripe")(process.env.stripe_secret_key);

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
        const courseCollection = summerCampSchoolDB.collection("classes");
        const selectedCourseCollection = summerCampSchoolDB.collection("selectedCourse");
        const paymentCollection = summerCampSchoolDB.collection("payment");


        // home popular course get api
        app.get('/home/course', async (req, res) => {
            const result = await courseCollection.find({ status: 'accepted' }).limit(6).toArray();
            res.send(result);
        });

        // home popular instructor get api
        app.get('/home/instructor', async (req, res) => {
            const result = await userCollection.find({ role: 'instructor' }).limit(6).toArray();
            res.send(result);
        });

        // all course get api
        app.get('/all-course', async (req, res) => {
            const result = await courseCollection.find().toArray();
            res.send(result);
        })

        // all instructor get api
        app.get('/all-instructor', async (req, res) => {
            const result = await userCollection.find({ role: 'instructor' }).toArray();
            res.send(result);
        })

        // see all course by instructor get api
        app.get('/see-all-course-by-instructor/:email', async (req, res) => {
            const instructorEmail = req.params.email;
            const result = await courseCollection.find({ instructor_email: instructorEmail }).toArray();
            res.send(result);
        })

        // single instructor total available course get api
        app.get('/single-instructor/total-course-count/:email', async (req, res) => {
            const instructorEmail = req.params.email;
            const result = await courseCollection.find({ instructor_email: instructorEmail }).toArray();
            res.send(result);
        })


        // user login info api
        app.post('/login-user', async (req, res) => {
            const userInfo = req.body;
            const userEmail = { email: userInfo.email };
            const existingUser = await userCollection.findOne(userEmail);
            if (existingUser) {
                return res.send({ message: 'user already exists', user: existingUser });
            }
            const result = await userCollection.insertOne(userInfo);
            res.send(result);
        });


        // student
        // student dashboard statices
        app.get('/student/all-statices', async (req, res) => {
            const enrolledCourse = await paymentCollection.find().toArray();
            const selectedCourse = await selectedCourseCollection.find().toArray();
            const upcomingCourse = await courseCollection.find({ status: 'pending' }).toArray();
            res.send({ enrolledCourse, selectedCourse, upcomingCourse });
        })

        // student selected course post api
        app.post('/student/selected-course', async (req, res) => {
            const selectedCourse = req.body;
            const result = await selectedCourseCollection.insertOne(selectedCourse);
            res.send(result);
        })

        // student selected course get api
        app.get('/student/selected-all-course', async (req, res) => {
            const result = await selectedCourseCollection.find().toArray();
            res.send(result);
        })

        // student selected course delete api
        app.delete('/student/delete-selected-course/:id', async (req, res) => {
            const course_id = req.params.id;
            const result = await selectedCourseCollection.deleteOne({ _id: new ObjectId(course_id) });
            res.send(result);
        })

        // student selected single course get api
        app.get('/student/selected-single-course/:id', async (req, res) => {
            const course_id = req.params.id;
            const result = await selectedCourseCollection.findOne({ _id: new ObjectId(course_id) });
            res.send(result);
        })

        // student selected course stripe payment post api
        app.post('/student/selected-course/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const totalAmount = parseFloat(amount.toFixed(2));
            const paymentIntent = await stripe.paymentIntents.create({
                amount: totalAmount,
                currency: "usd",
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        // after the successful stripe payment user and course data post api
        app.post('/student/selected-course/payment-info', async (req, res) => {
            const paymentInfo = req.body;
            const result = await paymentCollection.insertOne(paymentInfo);
            res.send(result);
        });

        // after the successful stripe payment delete the selected course
        app.delete('/student/selected-course/:id', async (req, res) => {
            const id = req.params.id;
            const result = await selectedCourseCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result)
        })

        // student enrolled course get api
        app.get('/student/enrolled-course', async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        })

        // student payment history get api
        app.get('/student/payment-history', async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        })


        // instructor
        // verify instructor email
        app.get('/instructor/:email', async (req, res) => {
            const instructorEmail = req.params.email;
            const query = await userCollection.findOne({ email: instructorEmail });
            res.send(query);
        })

        // add course
        app.post('/add-course', async (req, res) => {
            const courseData = req.body;
            const result = await courseCollection.insertOne(courseData);
            res.send(result);
        });

        // my course
        app.get('/my-course', async (req, res) => {
            const result = await courseCollection.find().toArray();
            res.send(result);
        });

        // edit my single course data get api
        app.get('/my-course/edit/show-data/:id', async (req, res) => {
            const course_id = req.params.id;
            const result = await courseCollection.findOne({ _id: new ObjectId(course_id) });
            res.send(result);
        });

        // update my single course data post api
        app.put('/my-course/update-data/:id', async (req, res) => {
            const course_id = req.params.id;
            const formData = req.body;
            const query = { _id: new ObjectId(course_id) };
            const options = { upset: true };
            const updateDoc = {
                $set: {
                    class_name: formData.class_name,
                    class_image: formData.class_image,
                    instructor_name: formData.instructor_name,
                    instructor_email: formData.instructor_email,
                    available_seats: formData.available_seats,
                    course_price: formData.course_price,
                    status: formData.status,
                    feedback: formData.feedback
                }
            }
            const result = await courseCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })


        // admin
        // manage user api
        app.get('/manage-user', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        // manage user role update api
        app.patch('/manage-user/update-role-admin/:userId', async (req, res) => {
            const userId = req.params.userId;
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

        app.patch('/manage-user/update-role-instructor/:userId', async (req, res) => {
            const userId = req.params.userId;
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

        // manage all course get api
        app.get('/manage-course', async (req, res) => {
            const result = await courseCollection.find().toArray();
            res.send(result);
        })

        // manage course approve patch api
        app.patch('/admin/approve-course/:id', async (req, res) => {
            const course_id = req.params.id;
            const query = { _id: new ObjectId(course_id) };
            const options = { upsert: true };
            const update = {
                $set: {
                    status: 'accepted'
                }
            }
            const result = await courseCollection.updateOne(query, update, options);
            res.send(result);
        });

        // manage course deny patch api
        app.patch('/admin/deny-course/:id', async (req, res) => {
            const course_id = req.params.id;
            const query = { _id: new ObjectId(course_id) };
            const options = { upsert: true };
            const update = {
                $set: {
                    status: 'rejected'
                }
            }
            const result = await courseCollection.updateOne(query, update, options);
            res.send(result);
        });

        // manage course previous feed data get api
        app.get('/admin/feedback/data/:id', async (req, res) => {
            const course_id = req.params.id;
            const result = await courseCollection.findOne({ _id: new ObjectId(course_id) });
            res.send(result);
        });

        // manage course feedback patch api
        app.patch('/admin/feedback/:id', async (req, res) => {
            const course_id = req.params.id;
            const course_feedback = req.body;
            const query = courseCollection.findOne({ _id: new ObjectId(course_id) })
            const options = { upsert: true }
            const updateDocument = {
                $set: {
                    feedback: course_feedback.feedback
                }
            }
            const result = await courseCollection.updateOne(query, updateDocument, options)
            res.send(result)
        });

        // manage course delete the course
        app.delete('/admin/delete-course/:id', async (req, res) => {
            const course_id = req.params.id;
            const result = await courseCollection.deleteOne({ _id: new ObjectId(course_id) });
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