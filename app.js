const express = require("express");
const path = require("path");
const process = require('process');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config()

const client = new MongoClient(process.env.MONGODB_URI);
client.connect();
const app = express();
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));
let corsOptions = {
   origin : ['http://localhost:57261', 'https://mstrhw.github.io', 'http://localhost:50999', 'http://localhost:49863'],
}
app.use(cors(corsOptions));
const port = 3000;


app.get("/get_user_info/:user_id", cors(corsOptions), async (req, res) => {
    console.log("/get_user_info " + req.params["user_id"]);
    var answer = "None";

    var user_id = "";
    if ("user_id" in req.params){
        user_id = "" + req.params["user_id"];
    }
    else{
        return "Set user_id";
    }

    const db = client.db("mydb");
    const collection = db.collection("users");
    var result = await collection.find({"user_id" : user_id}).toArray();
    if (result.length == 0)
    {
        const user = {user_id: user_id, onboarding: false, fraction: "NotSet"};
        result = await collection.insertOne(user);
        result = await collection.find({"user_id" : user_id}).toArray();
    }
    answer = result[0];
    // console.log("here" + answer);
    delete answer['_id'];
    res.send(answer);
});

app.get("/pass_onboarding/:user_id", async (req, res) => {
    console.log("/get_user_info " + req.params["user_id"]);

    var user_id = "" + req.params["user_id"];

    const db = client.db("mydb");
    const collection = db.collection("users");

    const filter = { "user_id": user_id };
    const options = { upsert: false };
    const updateDoc = {
      $set: {
        "onboarding": true
      },
    };
    // Update the first document that matches the filter
    const result = await collection.updateOne(filter, updateDoc, options);
    // console.log("here 1 " + result);
    res.send(result);
});

app.get("/choose_fraction/:user_id/:fraction", cors(corsOptions), async (req, res) => {
    console.log("/choose_fraction " + req.params["user_id"] + " " + req.params["user_id"]);
    var user_id = "" + req.params["user_id"];
    var fraction = req.params["fraction"];
    const db = client.db("mydb");
    const collection = db.collection("users");

    const filter = { "user_id": user_id };
    const options = { upsert: false };
    const updateDoc = {
      $set: {
        "fraction": fraction
      },
    };
    // Update the first document that matches the filter
    const result = await collection.updateOne(filter, updateDoc, options);
    await db.collection("user_gold_state").updateOne(filter, updateDoc, options);

    // console.log("here 2 " + result);
    res.send(result);
});

app.get("/get_tasks/:user_id", async (req, res) => {
    var user_id = "" + req.params["user_id"];
    const db = client.db("mydb");
    const collection = db.collection("tasks");

    const tasks = await collection.find().toArray();
    const user_state = await db.collection("task_state").findOne({"user_id": user_id});
    // console.log(user_state);
    var answer = []
    var summ = 0;
    for (var task in tasks)
    {
        var _append = tasks[task];
        delete _append["_id"];
        var status = user_state[_append["task_id"]];
        // console.log(_append, status)
        _append["status"] = status;
        if (status)
        {
            summ += _append["money"];
        }
        answer.push(_append)
    }

    res.send({tasksList: answer, summ: summ});
});

app.get("/get_tasks", async (req, res) => {
    var user_id = "" + req.params["user_id"];
    const db = client.db("mydb");
    const collection = db.collection("tasks");

    var result = await collection.find().toArray();
    var answer = [];
    for (var item in result)
    {
        delete result[item]["_id"];
        answer.push(result[item])
    }
    var full_answer = {"tasksList": answer};
    // console.log(full_answer);
    res.send(full_answer);
});

app.post("/add_task", async (req, res) => {
    console.log(req.body);
    const db = client.db("mydb");
    const collection = db.collection("tasks");
    var tasks_count = (await collection.find({}).toArray()).length;
    const task_id = tasks_count + 1;
    var task = {"task_id": task_id, "title": req.body.title, "link": req.body.link, "money": req.body.money}
    var result = await collection.insertOne(task);
    var task_id_dict = {}
    task_id_dict[task_id] = false;
    const task_state_coll = db.collection("task_state").updateMany({}, {  $set: task_id_dict  });
    res.send("Ok");
});

app.post("/remove_task", async (req, res) => {
    console.log(req.body);
    var task_id = parseInt(req.body.task_id, 10);
    const db = client.db("mydb");
    const collection = db.collection("tasks");
    var result = await collection.deleteOne({"task_id": task_id});
    var task_id_dict = {}
    task_id_dict[task_id] = 1
    const task_state_coll = db.collection("task_state").updateMany({}, {  $unset: task_id_dict  });
    res.send("Ok");
});

app.post("/approve_task", async (req, res) => {
    console.log(req.body);
    var task_id = parseInt(req.body.task_id, 10);
    var user_id = "" + req.body.user_id;
    const db = client.db("mydb");
    const collection = db.collection("task_state");
    var task_id_dict = {}
    task_id_dict[task_id] = true;
    const task_state_coll = collection.updateOne({"user_id": user_id}, {  $set:  task_id_dict });

    var task = await db.collection("tasks").findOne({task_id: task_id});
    var money = task["money"];
    await db.collection("user_gold_state").updateOne({"user_id": user_id}, { $inc: {gold: money} })

    res.send("Ok");
});
app.post("/create_user", async (req, res) => {
    console.log(req.body);
    const user_id = "" + req.body.user_id;
    const refer = req.body.refer;
    const db = client.db("mydb");
    const collection = db.collection("users");
    var users_count = (await collection.find({"user_id": user_id}).toArray()).length;
    var result = "Ok";
    if (users_count == 0)
    {
        const user = {user_id: user_id, refer: refer,onboarding: false, fraction: "NotSet", has_premium: false, counted: false};
        await collection.insertOne(user);
        const collection2 = db.collection("user_gold_state")
        await collection2.insertOne({"user_id": user_id, "fraction": "NotSet", "gold": 0});
        const collection3 = db.collection("task_state")
        const tasks = await db.collection("tasks").find({}).toArray();
        // console.log(tasks);
        var task_ids = {};
        for (var item in tasks)
        {
            task_ids[tasks[item]["task_id"]] = false;
        }
        task_ids["user_id"] = user_id;

        await collection3.insertOne(task_ids);
    }
    else
    {
        result = "already in db";
    }

    res.send("Ok");
});

app.get("/count_ref/:user_id", async (req, res) => {
    // console.log(req.body);
    const user_id = "" + req.params.user_id;
    const db = client.db("mydb");
    const collection = db.collection("users");
    const user = await collection.findOne({"user_id": user_id});
    const has_premium = user["has_premium"];
    var money = 2000;
    if (has_premium) {
        money = 25000;
    }
    if (user["refer"] != "")
    {
        await db.collection("user_gold_state").updateOne({"user_id": user["user_id"]}, {$inc: {gold: money}})
        await db.collection("users").updateOne({"user_id": user["user_id"]}, {$set: {counted: true}})
        await db.collection("user_gold_state").updateOne({"user_id": user["refer"]}, {$inc: {gold: money}})
    }

    res.send("Ok");
});

app.get("/my_refs/:user_id", async (req, res) => {
    // console.log(req.body);
    const user_id = "" + req.params.user_id;
    const db = client.db("mydb");
    const collection = db.collection("users");
    const users = await collection.find({"refer": user_id}).toArray();

    var answer = []
    var summ_money = 0;
    for (var user in users)
    {
        var money = 2000;
        if (users[user]["has_premium"])
        {
            money = 25000;
        }
        summ_money += money;
        answer.push({user_id: users[user]["user_id"], got_money: money})
    }

    res.send({"refs": answer, "summ": summ_money});
});

app.get("/my_gold/:user_id", async (req, res) => {
    // console.log(req.body);
    const user_id = "" + req.params.user_id;
    const db = client.db("mydb");
    const collection = db.collection("user_gold_state");
    const answer = await collection.findOne({"user_id": user_id});
    delete answer["_id"];
    res.send(answer);
});

app.get("/my_ref_link/:user_id", async (req, res) => {
    // console.log(req.body);
    const user_id = "" + req.params.user_id;
    const db = client.db("mydb");
    const collection = db.collection("urls");
    const result = await collection.findOne({"name": "invite_url"});

    var answer = {"url_link": result["link"] + user_id};
    console.log("invite url: " + answer["url_link"]);
    res.send(answer);
});

app.get("/fraction_stats", async (req, res) => {
    // console.log(req.body);
    const user_id = "" + req.params.user_id;
    const db = client.db("mydb");
    const collection = db.collection("user_gold_state");
    const users1 = await collection.find({"fraction": "House_1"}).toArray();
    var sum1 = 0
    for (var user1 in users1)
    {
        sum1 += users1[user1]["gold"];
    }

    const users2 = await collection.find({"fraction": "House_2"}).toArray();
    var sum2 = 0
    for (var user2 in users2)
    {
        sum2 += users2[user2]["gold"];
    }

    const users3 = await collection.find({"fraction": "House_3"}).toArray();
    var sum3 = 0
    for (var user3 in users3)
    {
        sum3 += users3[user3]["gold"];
    }
    var answer = {
        "House_1_sum": sum1,
        "House_1_count": users1.length,
        "House_2_sum": sum2,
        "House_2_count": users2.length,
        "House_3_sum": sum3,
        "House_3_count": users3.length
    }
//     const users = await collection.aggregate([
//   {
//     "$group": {
//       "_id": "$fraction",
//       "count": {
//         "$sum": 1
//       }
//     }
//   }
// ])
    res.send(answer);
});

const vercel_hello = "Express on Vercel changed again more"
app.get("/", function(req, res)
{

    res.send(vercel_hello);
});

app.listen(port, () => console.log("Server ready on port " + port));

