const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.stripe_secret_key);
const { query } = require('express');
//jsonwebtoken
const jwt = require("jsonwebtoken");
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middelware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.db_name}:${process.env.db_pass}@cluster0.n7lbmc2.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//varify jwt
function varifyJWT(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.access_token, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbiden Access' })
        }
        req.decoded = decoded;
        next();

    })
}


async function run() {
    try {
        await client.connect();
        const menCollection = client.db('productManagement').collection('men');
        const orderCollection = client.db('productManagement').collection('order');
        const userCollection = client.db('productManagement').collection('user');
        const reviewCollection = client.db('productManagement').collection('reviews');
        const paymentCollection = client.db('productManagement').collection('payments');

        app.get('/mens', async (req, res) => {
            const query = {};
            const cursor = menCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/mens/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const cursor = await menCollection.findOne(query);
            res.send(cursor);
        })
        //item post
        app.post('/mens', async (req, res) => {
            const item = req.body;
            const result = await menCollection.insertOne(item);
            res.send(result);
        })
        //delete man from men collection
        app.delete('/mens/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await menCollection.deleteOne(query);
            res.send(result);
        })
        //review post
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })
        //review get
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const review = await cursor.toArray();
            res.send(review);
        })

        //update after delivered
        app.put('/mens/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const latestQuantity = req.body;
            console.log(latestQuantity)
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const latestValue = {
                $set: {
                    quantity: latestAvailable.quantity
                }
            };
            console.log(latestValue);
            const result = await menCollection.updateOne(filter, latestValue, options);
            res.send(result)
        })

        //  post the order
        app.post('/order', async (req, res) => {
            const booking = req.body;
            const result = await orderCollection.insertOne(booking);
            res.send({ success: true, result });
        })
        //get all order
        // app.get('/order',async(req,res)=>{
        //     const query={};
        //     const cursor=orderCollection.find(query);
        //     const order=await cursor.toArray();
        //     res.send(order);
        // })
        //query the order by order email
        app.get('/order', async (req, res) => {
            const email = req.query.email;
            // const decodedEmail = req.decoded.email;
            // if (decodedEmail === email) {
            //     const query = { email: email };
            //     const result = await orderCollection.find(query).toArray();
            //     return res.send(result);
            // }
            // else{
            //     return res.status(403).send({message:"Forbidden access"})
            // }
            /////////up or down

            const query = { email: email };
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.deleteOne(query);
            res.send(order);
        })
        //


        //update the user by email
        app.put('/user/:email', async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            //jwt
            const token = jwt.sign({ email: email }, process.env.access_token, { expiresIn: '1h' });
            res.send({ result, token });
        })
        app.get('/user', async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const user = await cursor.toArray();
            res.send(user);
        })
        //make admin
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: {role:'admin'}
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        //get admin
        app.get('/admin/:email',async(req,res)=>{
            const email=req.params.email;
            const user=await userCollection.findOne({email:email});
            const isAdmin=user.role==='admin';
            res.send({isAdmin:isAdmin})
        })

        //
        app.get('/order/:id',async(req,res)=>{
            const id=req.params.id;
            const query={_id:ObjectId(id)};
            const order=await orderCollection.findOne(query);
            res.send(order);
        })
        app.get('/order',async(req,res)=>{
            const query={};
            const result=await orderCollection.find(query).toArray();
            res.send(result);
        })
        //
        app.patch('/order/:id',async(req,res)=>{
            const payment=req.body;
            const id=req.params.id;
            const filter={_id:ObjectId(id)};
            const updateddDoc={
                $set:{
                    paid:true,
                    transactionId:payment.transactionId,
                }
            };
            const updatedOrder=await orderCollection.updateOne(filter,updateddDoc);
            const result=await paymentCollection.insertOne(payment);
            res.send(updateddDoc);

        })

        //stripe
        app.post('/create-payment-intent',async(req,res)=>{
            const service=req.body;
            const price=service.total;
            const amount=100*price;
            const paymentIntent=await stripe.paymentIntents.create({
            amount:amount,
            currency:'usd',
            payment_method_types:['card']
            });
            res.send({clientSecret:paymentIntent.client_secret})
        })

    }
    finally {

    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('I am saying from Product Management');
})
app.listen(port, () => {
    console.log('I AM REARY ', port);
})