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
   origin : ['*', 'https://mstrhw.github.io', 'http://localhost:54144'],
}
app.use(cors(corsOptions));
const port = 3000;


function make_struct(keys) {
      if (!keys) return null;
      const k = keys.split(', ');
      const count = k.length;

      /** @constructor */
      function constructor() {
        for (let i = 0; i < count; i++) this[k[i]] = arguments[i];
      }
      return constructor;
}

const UserStruct = new make_struct("user_id, refer, onboarding, fraction, has_premium, counted");
const UserGoldState = new make_struct("user_id, fraction, gold");
const UserWallets = new make_struct("user_id, wallet");
const UserClaimTime = new make_struct("user_id, last_claim_time, claims_count");
const TaskStruct = new make_struct("task_id, title, link, money, auto_accept");


async function find_user(user_id) {
    var answer = "None";
    const db = client.db("mydb");
    const user = await db.collection("users").find({"user_id" : user_id}).toArray();

    if (user.length > 0)
    {
        answer = user[0];
    }
    delete answer["_id"];
    return answer;
}

async function find_wallets(user_id) {
    var answer = "None";
    const db = client.db("mydb");
    const user = await db.collection("wallets").find({"user_id" : user_id}).toArray();

    if (user.length > 0)
    {
        answer = user[0];
    }
    delete answer["_id"];
    return answer;
}

async function find_user_gold_state(user_id) {
    var answer = "None";
    const db = client.db("mydb");
    const user = await db.collection("user_gold_state").find({"user_id" : user_id}).toArray();

    if (user.length > 0)
    {
        answer = user[0];
    }
    delete answer["_id"];
    return answer;
}

async function find_user_tasks(user_id) {
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

    return {tasksList: answer, summ: summ};
}

async function find_refs(user_id) {
    const db = client.db("mydb");
    const users = await db.collection("users").find({"refer": user_id}).toArray();

    var answer = [];
    var summ_money = 0;
    for (var user in users) {
        var money = 2000;
        if (users[user]["has_premium"]) {
            money = 25000;
        }
        summ_money += money;
        answer.push({user_id: users[user]["user_id"], got_money: money})
    }

    return {"refs": answer, "summ": summ_money};
}

async function find_full_user_info(user_id) {
    var answer = "None";
    const db = client.db("mydb");
    const user= await find_user(user_id);

    if (user != "None")
    {
        const user_gold_state = await find_user_gold_state(user_id);
        const user_wallets = await find_wallets(user_id);
        const user_claim_time = await claim_time(user_id);
        const tasks = await find_user_tasks(user_id);
        const refs = await find_refs(user_id);
        answer = {
            user: user,
            user_gold_state: user_gold_state,
            user_wallet: user_wallets,
            user_claim_time: user_claim_time,
            tasks: tasks,
            refs: refs
        };
    }

    return answer;
}

async function add_wallet(user_id, wallet) {
    var answer = "None";
    const db = client.db("mydb");
    const user = await db.collection("wallets").find({"user_id" : user_id}).toArray();

    if (user.length > 0)
    {
        var wallets = {
            wallet: user[0]["wallet"]
        };
        wallets["wallet"] = wallet;
        const task_state_coll =  await db.collection("wallets").updateOne({"user_id": user_id}, {  $set:  wallets });
    }

    return answer;
}

async function claim_time(user_id) {
    var answer = "None";
    const db = client.db("mydb");
    const user = await db.collection("claim_time").find({"user_id" : user_id}).toArray();

    if (user.length > 0)
    {
        const claim_time = await db.collection("rules").find({"name": "claim_timeout"}).toArray();
        const time_to_claim = user[0]["last_claim_time"] + claim_time[0]["timeout_s"] * 1000 - Date.now();
        const can_claim =  (Date.now() - claim_time[0]["timeout_s"] * 1000) > user[0]["last_claim_time"];
        user[0]["can_claim"] = can_claim;
        user[0]["time_to_claim"] = time_to_claim;
        answer = user[0];
    }
    delete answer["_id"];
    return answer;
}

app.get("/get_user_info/:user_id", cors(corsOptions), async (req, res) => {
    console.log("/get_user_info " + req.params["user_id"]);
    const start = performance.now();
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
    var result = await find_user(user_id);

    const end = performance.now();
    const exec_time = end - start;
    result["exec_time"] = exec_time

    res.send(result);
});

app.get("/get_full_info/:user_id", cors(corsOptions), async (req, res) => {
    console.log("/get_full_info " + req.params["user_id"]);
    const start = performance.now();
    var answer = "None";

    var user_id = "";
    if ("user_id" in req.params){
        user_id = "" + req.params["user_id"];
    }
    else{
        return "Set user_id";
    }

    const user = await find_full_user_info(user_id);
    console.log("end " + req.params["user_id"]);
    const end = performance.now();
    const exec_time = end - start;
    user["exec_time"] = exec_time

    res.send(user);
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

app.get("/add_wallet/:user_id/:wallet", cors(corsOptions), async (req, res) => {
    console.log("/add_wallet " + req.params["user_id"] + " " + req.params["wallet"]);
    const user_id = "" + req.params["user_id"];
    const wallet = req.params["wallet"];
    await add_wallet(user_id, wallet);
    const answer = await find_wallets(user_id);
    console.log(answer);
    res.send(answer);
});

app.get("/get_tasks/:user_id", async (req, res) => {
    console.log("/get_tasks " + req.params["user_id"]);
    var user_id = "" + req.params["user_id"];

    const answer = await find_user_tasks(user_id);

    res.send(answer);
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
    const task_id = "" + (tasks_count + 1);
    const task = new TaskStruct(task_id, req.body.title, req.body.link, parseInt(req.body.money), req.body.auto_accept);
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

app.get("/approve_task_unity/:user_id/:task_id", async (req, res) => {
    console.log(req.body);
    var user_id = "" + req.params["user_id"];
    var task_id = "" + req.params["task_id"];
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

async function claim_timeout(user_id) {
    const db = client.db("mydb");
    const result = await claim_time(user_id);
    if (result != "None") {
        if (result["can_claim"]) {
            await db.collection("user_gold_state").updateOne({"user_id": user_id}, {$inc: {gold: 500}})
            await db.collection("claim_time").updateOne({"user_id": user_id}, {$set: {last_claim_time: Date.now()}, $inc: {claims_count: 1}})
        }
    }
}
app.get("/claim_timeout/:user_id", async (req, res) => {
    console.log("claim_timeout");
    console.log(req.body);
    var user_id = "" + req.params["user_id"];
    const result = await claim_timeout(user_id);
    const answer_time= await claim_time(user_id);
    const answer_state = await find_user_gold_state(user_id);
    const answer = {
        claim_time: answer_time,
        gold_state: answer_state,
    }
    console.log(answer);
    res.send(answer);
});

app.post("/create_user", async (req, res) => {
    const start = performance.now();

    const user_id = "" + req.body.user_id;
    const refer = req.body.refer;
    const has_premium = req.body.has_premium;

    const db = client.db("mydb");
    const collection = db.collection("users");
    const answer= await find_user(user_id);
    var result = "Ok";
    if (answer == "None")
    {
        const user = new UserStruct(user_id, refer, false, "NotSet", has_premium, false);
        const user_gold_state = new UserGoldState(user_id, "NotSet", 0);
        const user_wallets = new UserWallets(user_id, "");
        const claim_time = await db.collection("rules").find({"name": "claim_timeout"}).toArray();
        const user_claim_time = new UserClaimTime(user_id, Date.now() - claim_time[0]["timeout_s"] * 1000, 0);

        result = await collection.insertOne(user);
        result = await db.collection("user_gold_state").insertOne(user_gold_state);
        result = await db.collection("wallets").insertOne(user_wallets);
        result = await db.collection("claim_time").insertOne(user_claim_time);
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
    const end = performance.now();
    const exec_time = end - start;

    res.send("Ok: " + exec_time);
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
    res.send(answer);
});

const vercel_hello = "Express on Vercel changed again more"
app.get("/", function(req, res)
{

    res.send(vercel_hello);
});

app.listen(port, () => console.log("Server ready on port " + port));

