const express=require('express');
const session=require('express-session');
const path=require('path');
const axios = require('axios');
const bcrypt=require('bcrypt');
const bodyparser=require('body-parser');
const app=express();
const port=5000;
const admin = require('firebase-admin');

const serviceAccount=require('./key.json');


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.set('view engine','ejs');

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));

app.use(session({
    secret:'secrect',
    resave:false,
    saveUninitialized:true
}));
//using static file
app.use('/static',express.static(path.join(__dirname,'public')));


//signup page
app.get('/signup',function(req,res){
    res.render('signup');
});

//signup route
app.post('/signup',async(req,res)=>{
    const {username,email,password}=req.body;
    const hashing=await bcrypt.hash(password,10);
    await db.collection('todo').doc(email).set({
        username,
        email,
        password:hashing,
    });
    res.redirect('/login')
});

//login page
app.get('/login',function(req,res){
    res.render('login');
});

//loginroute
app.post('/login',async (req,res)=>{
    const {email,password}=req.body;
    const userinfo=await db.collection('todo').doc(email).get();
    if(!userinfo.exists){
        res.send('user does not exist ');
    };
    const doc=userinfo.data();
    const match= await bcrypt.compare(password,doc.password);
    if(match){
        req.session.userId=userinfo.id;
        req.session.username=userinfo.username;
        res.redirect('/dashboard');
    }else{
        res.send('Incorrect password');
    }
});


app.get('/',(req,res)=>{
    res.redirect('login')
});

app.get('/dashboard',(req,res)=>{
    if(!req.session.userId){
        res.redirect('/login');
    }
    else{
        res.render('page');
    }
});

app.post('/search', async (req, res) => {
  const word = req.body.word;
  const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;

  try {
      const response = await axios.get(apiUrl);
      const wordDetails = response.data[0] || null;

      if (wordDetails) {
          const wordData = {
              word: wordDetails.word || '',
              phonetic: wordDetails.phonetic || '',
              partsOfSpeech: wordDetails.meanings[0].partOfSpeech || '',
              definition: wordDetails.meanings[0].definitions[0].definition || '',
              example: wordDetails.meanings[0].definitions[0].example || ''
          };

          await db.collection('words').add(wordData);

          res.render('result', { word: wordData });
      } else {
          res.render('result', { word: null });
      }
  } catch (error) {
      console.error('Error fetching data from Dictionary API:', error);
      res.render('result', { word: null });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
