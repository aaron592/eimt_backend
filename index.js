const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const winston = require('winston');
const app = express();
app.use(express.json());
app.use(cors());

app.use(express.urlencoded({extended:true}));

const logger = winston.createLogger({
    level: 'info',
    transports: [
      new winston.transports.Console({
          fromat:winston.format.combine(winston.format.colorize({all:true}))
      }),
      new winston.transports.File({ filename: 'error.log',level:'error' })
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'exceptions.log' })
      ]
  });

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URL,{
    useNewUrlParser: true
})
.then(()=>{
    logger.info("Mongodb connection successfully");
})
.catch((err)=>{
    logger.error(err.message);
})

// admin schema

const adminSchema = new mongoose.Schema({
    name:{type:String,required:true},
    password:{type:String,required:true}
})

// courses schema 

const courseSchema = new mongoose.Schema({
    name:{type:String,required:true, minLength:5, maxLength:35},
    image:{type:String,required:true},
    description:{type:String,required:true, minLength:5, maxLength:210},
    course:{type:String,required:true}
})

// form schema

const formSchema = new mongoose.Schema({
    username:{type:String,required:true},
    email:{type:String,required:true},
    phone:{type:String,required:true},
    msg:{type:String,required:true}
})

//course model 

const courseModel = new mongoose.model("courses",courseSchema);

// form model

const formModel = new mongoose.model("forms",formSchema);

// admin model

const adminModel = new mongoose.model("admins",adminSchema);

app.post('/admin',(req,res)=>{
    let data = req.body;
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(data.password,salt,(err,en_p)=>{
            data.password = en_p;

            let adminOBJ = new adminModel(data);
            adminOBJ.save()
            .then(()=>{
                res.send({message:"Admin registered"});
            })
            .catch((err)=>{
                console.log(err);
                res.send({message:"Some problem in creating user"});
            })


        })
    })
})

app.post("/admin/login",(req,res)=>{
    let data = req.body;
    adminModel.findOne({name:data.name})
    .then((user)=>{
        if(user!==null){
           bcrypt.compare(data.password,user.password,(err,result)=>{
               if(result!=true){
                   res.send({message:"Email found but password is incorrect"});
               }else{
                   jwt.sign(data,"admin",(err,token)=>{
                       res.send({success:true,token:token,name:user.name,user_id:user._id})
                   })
               }
           })
        }else{
            res.send({success:false,message:"Incorrect email"})
        }
    })
    .catch((err)=>{
        console.log(err);
        res.send({success:false,message:"Some problem"})
    })
})

app.post("/course",verifyToken,(req,res)=>{
    let data = req.body;
    let courseOBJ = new courseModel(data);
    courseOBJ.save()
    .then(()=>{
        res.send({message:"Course created"});
    })
    .catch((err)=>{
        console.log(err);
        res.send({message:"Some error in creating course"})
    })
})

app.get("/courses",(req,res)=>{
    courseModel.find()
    .then((courses)=>{
        res.send(courses);
    })
    .catch((err)=>{
        console.log(err);
        res.send({message:"Some problem in getting courses"});
    })
})

app.get("/course/sub/:id",(req, res)=>{
    let id = req.params.id;
    courseModel.findOne({_id:id})
    .then((course)=>{
        res.send(course);
    })
    .catch((err)=>{
        console.log(err);
        res.send({message:"Some error in getting course"});
    })
})

app.post("/submit",(req,res)=>{
    let data = req.body;
    let formOBJ = new formModel(data);
    formOBJ.save()
    .then(()=>{
        res.send({message:"Submitted Successfully"});
    })
    .catch((err)=>{
        console.log(err);
        res.send({message:"Some error in submitting form"})
    })
})

app.get("/data",(req,res)=>{
    formModel.find()
    .then((data)=>{
        res.send(data);
    })
    .catch((err)=>{
        console.log(err);
        res.send({message:"Some problem in getting data"});
    })
})

function verifyToken(req,res,next){
    if(req.headers.authorization!==undefined){
        let token = req.headers.authorization.split(" ")[1];
        jwt.verify(token,"admin",(err,userCreds)=>{
            if(err==null){
                next();
            }else{
                res.status(401).send({message:"Incorrect token"})
            }
        })
    }else{
        res.status(403).send({message:"Invalid token"})
    }
 }

app.listen(PORT,()=>{
    logger.warn(`Server started at ${PORT}`);
})