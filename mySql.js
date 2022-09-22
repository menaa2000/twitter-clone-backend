var express = require("express");
//var router = express.Router();//take object

const port = 3000
const mysql_connector = require('mysql');
const connection = mysql_connector.createConnection({
  host : 'localhost',
  user : 'root',
  password  :'',
  database : 'users_data'
});



connection.connect(function(err) {
  if (err) throw err
  console.log('You are now connected...')

})


module.exports=connection;