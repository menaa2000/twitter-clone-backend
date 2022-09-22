const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var bodyParser = require('body-parser');
const express = require("express");
const app = express();
var db = require('./mySql');
const QueryString = require("qs");
app.use(express.json());
var query_string;
app.post('/signup', (req, res) => {
    query_string = `select count(*) from user where email = "${req.body.email}"`
    db.query(query_string, async (err, results, fields) => {
        if (err)
            return res.status(400).json(err)
        if (results[0]['count(*)'] !== 0)
            return res.status(400).json('Error: There is already an account associated with that email.')
        console.log("Creating account...");
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        query_string = `
     insert into user ( name,email,password)
     values  (" ${req.body.name}", "${req.body.email}", "${hashedPassword}");`
        console.log("Sign Up Query is: " + query_string);
        db.query(query_string, (err, results, fields) => {
            query_string = `select id, name from user where name=" ${req.body.name}" `
            db.query(query_string, (err, results, fields) => {
                var name_added = results[0].name;
                var id_added = results[0].id;
                var username = name_added + id_added;
                console.log(username);
                query_string = ` update user set user_name=("${username}") where name=" ${req.body.name}";`
                console.log("Sign Up Query is: " + query_string);
                console.log(username);
                db.query(query_string, (err, results, fields) => {
                    res.status(200);
                });
            });
        });
        res.json("User added!");
    });
})

app.post('/login', (req, res) => {
    query_string = `select id,user_name,password from user where user_name=" ${req.body.username}";`
    //handel if there is no user and id return
    db.query(query_string, async (err, results, fields) => {
        if (results[0] === undefined) return res.send("Invalid user")
        //else
        const user_payload =//create user to login
        {
            id: results[0].id,
            name: results[0].user_name
        };
        const isPasswordMatched = await bcrypt.compare(
            req.body.password,
            results[0].password
        );
        if (isPasswordMatched === true) {
            const jwtToken = jwt.sign(user_payload, "secret_key");//take payload and key and as syn so take callback fn to take token
            return res.send({ jwtToken });
        }
        return res.send("Invalid password");
    })
})
app.post("/add_tweet", verify_token, function (req, res) {
    let { username } = req;
    console.log(username + "usss");
    var string = `select id from user where user_name='${username}';`;
    db.query(string, (err, results, fields) => {
        if (err) return res.status(400).json(err)
        let { id } = results[0].id;
        query_string = `
         insert into tweets ( records,user_id)
         values  (" ${req.body.records}", "${results[0].id}");`
        db.query(query_string, (err, results, fields) => {
            if (err) return res.status(400).json(err)
            return res.status(200).json("Tweet added successfully");
        })
    })
})
app.post("/follow_user", verify_token, function (req, res) {
    let { username } = req;
    let {id } = req;
    string = `select id from user where user_name =" ${req.body.user_name_dest}";`;
    db.query(string, (err, results, fields) => {
        if (err)
            return res.status(400).json(err)
        if (results[0] === undefined)
            return res.send('Error: user not found.');
        query_string = `
    insert into followers ( source_user_id,dest_user_id)
    values  (" ${id}", "${results[0].id}");`
        console.log("followers Query is: " + query_string);
        db.query(query_string, (err, results, fields) => {
            if (err) throw err;
            res.send("follow Record inserted successfully...");

        });
    });
})
app.post("/search_user", verify_token, function (req, res) {
    let { username } = req;
    string = `select id from user where user_name =" ${req.body.username}";`;
    db.query(string, (err, results, fields) => {
        console.log(results[0].id + "ijkjk");
        if (err)
            return res.status(400).json(err)
        if (results[0] === undefined)
            return res.send('Error: user not found.');
        string = `select records from tweets where user_id =" ${results[0].id}";`;
        db.query(string, (err, results, fields) => {
            console.log("tweets: " + results);
            console.log("query" + string);
        });
        string = `select source_user_id from followers where dest_user_id =" ${results[0].id}";`;
        db.query(string, (err, results, fields) => { 
            const queryResults = []//as it return object so need to loop on it
            results.forEach(element => {
                queryResults.push(element.source_user_id)
            })
            console.log("Followers of u : " + queryResults);

        });
    });
})
app.delete("/delete_tweet", verify_token, function (req, res) {
    let { username } = req;
    var string = `select id from user where user_name='${username}';`;
    db.query(string, (err, results, fields) => {
        if (err) return res.status(400).json(err)
        if (results[0].id === undefined) return res.send('Error: user not found.');
        query_string = `
    delete from tweets WHERE user_id = "${results[0].id}";`
        db.query(query_string, (err, results, fields) => {
            console.log(results[0] + "s");
            if (err) console.log("error in delete operation", err);
            if (results[0] === undefined) return res.send('Error: user has no tweets.');
            return res.status(200).json("Tweet deleted successfully");
        });
    });
})

function verify_token(req, res, next)
{
    let jwtToken, username;
    const bearerHeader = req.headers['authorization'];
    //check if bear is undefined
    if (typeof bearerHeader !== undefined) {
        const bearer = bearerHeader.split(' ');//
        //get token from arr.. its second word
        jwtToken = bearer[1];
        //set token
        req.token = jwtToken;
        if (jwtToken !== undefined) {
            console.log('verifying');
            jwt.verify(jwtToken, "secret_key", async (error, user_payload) => {
                if (error) {
                    res.status(401);
                    res.send("Invalid JWT Token");
                } else {
                    // req.username = user_payload.name;
                      req.id = user_payload.id;
                    // res.send("helllo");
                    req.username = user_payload.name;
                    console.log(req.username + "ooo");
                    console.log(req.id+ "ooo");
                }
            });
        }
    }
    else {
        //forbidden
        res.sendStatus(403);
        //as we cant access without token
    }
    next();
    //     next();
}
const server = app.listen(3000, () => console.log('Running…'));
setInterval(() => server.getConnections(
    (err, count) => console.log(`${count} connections currently open`)
), 10000);
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
let connections = [];
server.on('connection', connection => {
    connections.push(connection);
    connection.on('close', () => connections = connections.filter(curr => curr !== connection));
});
function shutDown() {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
        console.log('Closed out remaining connections');
        db.destroy();
        process.exit(0);
    });
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
    connections.forEach(curr => curr.end());
    setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
}





























