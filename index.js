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
        const contactUsCollection = summerCampSchoolDB.collection("contactUs");


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

        // contact us message post api
        app.post('/contact-us/message', async (req, res) => {
            const message = req.body;
            const result = await contactUsCollection.insertOne(message);
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

        // after the successful stripe payment decrement course available seats
        app.patch('/student/course/available-seat-decrement/:id', async (req, res) => {
            const id = req.params.id;
            const courseSeatDecrement = parseFloat(req.body.available_seats);
            const query = { _id: new ObjectId(id) };
            const option = { upsert: true };
            const updateDoc = {
                $set: {
                    available_seats: courseSeatDecrement - 1
                }
            }
            const result = await courseCollection.updateOne(query, updateDoc, option);
            console.log(result);
            res.send(result);
        })

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
        // instructor dashboard statices accepted course get api
        app.get('/total-approve/course/:email', async (req, res) => {
            const email = req.params.email;
            const acceptedCourse = await courseCollection.find({ instructor_email: email, status: 'accepted' }).limit(4).sort({ class_name: -1 }).toArray();
            res.send(acceptedCourse);
        })

        // instructor dashboard statices accepted course get api
        app.get('/total-approve/course/:email', async (req, res) => {
            const email = req.params.email;
            const acceptedCourse = await courseCollection.find({ instructor_email: email, status: 'accepted' }).toArray();
            res.send(acceptedCourse);
        })

        // instructor dashboard statices pending course get api
        app.get('/total-pending/course/:email', async (req, res) => {
            const email = req.params.email;
            const pendingCourse = await courseCollection.find({ instructor_email: email, status: 'pending' }).toArray();
            res.send(pendingCourse);
        })

        // instructor dashboard statices rejected course get api
        app.get('/total-rejected/course/:email', async (req, res) => {
            const email = req.params.email;
            const rejectedCourse = await courseCollection.find({ instructor_email: email, status: 'rejected' }).toArray();
            res.send(rejectedCourse);
        })

        // verify instructor email
        app.get('/instructor/:email', async (req, res) => {
            const instructorEmail = req.params.email;
            const result = await userCollection.findOne({ email: instructorEmail });
            res.send(result);
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
            const options = { upsert: true };
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
        // admin dashboard statices
        app.get('/admin-dashboard/statices', async (req, res) => {
            // user status
            const admin = await userCollection.countDocuments({ role: 'admin' });
            const instructor = await userCollection.countDocuments({ role: 'instructor' });
            const student = await userCollection.countDocuments({ role: 'student' });
            // course status
            const pending = await courseCollection.countDocuments({ status: 'pending' });
            const accepted = await courseCollection.countDocuments({ status: 'accepted' });
            const rejected = await courseCollection.countDocuments({ status: 'rejected' });
            // contact message
            const contactUnseenMessage = await contactUsCollection.countDocuments({ status: 'unseen' });
            // total enrolled course
            const enrolledCourse = await paymentCollection.countDocuments();
            res.send({ admin, instructor, student, pending, accepted, rejected, contactUnseenMessage, enrolledCourse });
        })

        // admin dashboard statices total revenue
        app.get('/admin-dashboard/statices/total-revenue', async (req, res) => {
            const totalEnrolledCoursePrice = await paymentCollection.find().toArray();
            res.send(totalEnrolledCoursePrice);
        })

        // admin dashboard user get api
        app.get('/admin-dashboard/statices/user', async (req, res) => {
            const result = await userCollection.find().sort({ name: 1 }).limit(4).toArray();
            res.send(result);
        })

        // admin dashboard approve course get api
        app.get('/admin-dashboard/statices/approve-course', async (req, res) => {
            const result = await courseCollection.find({ status: 'accepted' }).limit(4).toArray();
            res.send(result);
        })

        // admin dashboard user get api
        app.get('/admin-dashboard/')

        // manage user api
        app.get('/manage-user', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        // manage user status update put api
        app.put('/admin/manage-user/update/view-status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const option = { upsert: true }
            const updateDocument = {
                $set: {
                    status: 'seen'
                }
            }
            const result = await userCollection.updateOne(filter, updateDocument, option);
            res.send(result);
        })

        // manage user role admin update api
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

        // manage user role instructor update api
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
            const filter = { _id: new ObjectId(course_id) };
            const options = { upsert: true };
            const update = {
                $set: {
                    status: 'rejected'
                }
            }
            const result = await courseCollection.updateOne(filter, update, options);
            res.send(result);
        });

        // manage course update view status put api
        app.put('/admin/manage-course/update/view-status/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const option = { upsert: true }
            const updateDocument = {
                $set: {
                    view_status: 'seen'
                }
            }
            const result = await courseCollection.updateOne(filter, updateDocument, option);
            res.send(result);
        })

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
            const filter = { _id: new ObjectId(course_id) }
            const options = { upsert: true }
            const updateDocument = {
                $set: {
                    feedback: course_feedback.feedback
                }
            }
            const result = await courseCollection.updateOne(filter, updateDocument, options)
            res.send(result)
        });

        // manage course delete the course api
        app.delete('/admin/delete-course/:id', async (req, res) => {
            const course_id = req.params.id;
            const result = await courseCollection.deleteOne({ _id: new ObjectId(course_id) });
            res.send(result);
        });

        // payment history get api
        app.get('/all-payment-history', async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        })

        // payment history unseen get api
        app.get('/admin/payment-history/unseen', async (req, res) => {
            const result = paymentCollection.find({ status: 'unseen' }).toArray();
            res.send(result);
        })

        // payment history delete api
        app.delete('/admin/delete-payment-history/:id', async (req, res) => {
            const id = req.params.id;
            const result = await paymentCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        // contact us get api
        app.get('/contact-us/message', async (req, res) => {
            const result = await contactUsCollection.find().toArray();
            res.send(result);
        })

        // contact us menu mew message count get api
        app.get('/contact-us/total-new-message-count', async (req, res) => {
            const result = await contactUsCollection.find({ status: 'unseen' }).toArray();
            res.send(result);
        });

        // contact us seen message put api
        app.put('/contact-us/single-massage-seen/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDocument = {
                $set: {
                    status: data.status
                }
            }
            const result = await contactUsCollection.updateOne(filter, updateDocument, options);
            res.send(result);
        })

        // contact us single massage in modal get api
        app.get('/contact-us/single-massage-modal/:id', async (req, res) => {
            const id = req.params.id;
            const result = await contactUsCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        // contact us single massage delete api
        app.delete('/contact-us/single-message/delete/:id', async (req, res) => {
            const id = req.params.id;
            const result = await contactUsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

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