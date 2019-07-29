const express = require("express")
const router = express.Router()
const Parse = require("parse/node")
var currentUser = Parse.User.current()


router.get('/', function(req, res, next) {
    if(currentUser){
        return res.render('customer/home', {user: currentUser.getUsername(), role: currentUser.get('role')})
    }
    res.render('customer/home')
});

router.get("/signup", function(req, res, next) {
    res.render("customer/signup");
})

router.post("/signup", function(req, res, next) {
    signup(req, res);
})

router.get("/login", (req, res) => {
    res.render("customer/login");
})

router.post("/login", (req, res) => {
    login(req, res);
})

router.get("/log-out", (req, res) => {
    Parse.User.logOut().then(
        function() {
        res.redirect("/");
        },
        function(error) {
        _error(req, res, error);
        }
    );
})

router.get('/stations', (req, res) => {
    if(!currentUser) {
        return res.render('customer/home', {err: 'You must login first'})
    }

    const Stations = new Parse.User()
    let query = new Parse.Query(Stations)
    query.equalTo('role', 'Station')
    query.find().then((users)=>{
        let stations = []
        users.forEach(user => {
            let station = {
                name: user.getUsername(),
                petrol: user.get('petrol'),
                diesel: user.get('diesel')
            }
            stations.push(station)
        });
        return res.render('customer/stations_list', {stations :stations, user : currentUser.getUsername(), role: currentUser.get('role') })
    }).catch(err => {
        _error(req, res, err)
    })
})

router.get('/stations/:station', (req, res) => {
    if(!currentUser){
        return res.render('welcome')
    }
    res.render('customer/buy_form', {
        user : currentUser.getUsername(), 
        role : currentUser.get('role')
    })
})

router.post('/stations/:station', (req, res) => {
    if(!currentUser){
        return res.render('welcome')
    }
    if(req.body.type == "--SELECT--"){
        return res.render('customer/buy_form', {err: 'Choose the type of fuel you want to buy'})
    }
    transaction(req, res)
})

router.get('/transactions', (req, res) => {
    if(!currentUser){
        return res.render('customer/home', {err: 'Login first'})
    }
    const transactions = Parse.Object.extend('Transactions')
    let query = new Parse.Query(transactions)
    query.equalTo('buy', currentUser.getUsername())
    query.find().then(results=>{
        let resu = []
        results.forEach(result => {
            var obj = {
                buyer: result.get('buy'),
                station: result.get('station'),
                type: result.get('type'),
                cost: result.get('cost'),
                litres: result.get('litres'),
                collected: result.get('collected')
            }
            resu.push(obj)
        })
        res.render('customer/transactions_list', {user: currentUser.getUsername(), role: currentUser.get('role'), transactions: resu})
    }).catch(err => {
        _error(req, res, err)
    })
})

function transaction(req, res) {
    const Transaction = new  Parse.Object('Transactions')
    Transaction.set('buy', currentUser.getUsername())
    Transaction.set('station', req.params.station)
    Transaction.set('type', req.body.type)
    Transaction.set('litres', Number(req.body.n_litres) )
    Transaction.set('cost', Number(req.body.n_litres) * 8 )
    Transaction.set('cancelled', false)
    Transaction.save().then(result => {
        updateUser(req, res)
    }).catch(err=>{
      _error(req, res, err)
    })
}

function updateUser(req, res) {
    let query = new Parse.Query(Parse.User)
  query.equalTo('username', req.params.station)
  query.find({useMasterKey: true})
    .then((user) =>{
      
      if (req.body.type === 'petrol') {
        user[0].set('petrol', String(user[0].get('petrol') - req.body.n_litres ))
      }
      else if (req.body.type === 'diesel') {
        user[0].set('diesel', String(user[0].get('diesel') - req.body.n_litres ))
      }
      else{
        return res.render('buy_form', {err: 'fuel type not found'})
      }
      user[0].save()
        .then(result=>{
          res.render('customer/home', {
            user: currentUser.getUsername(),
            role: currentUser.get('role')
          })
        })
        .catch(err=>{
          _error(req, res, err)
        })

    })
    .catch(err => {
      _error(req, res, err)
    })
}

signup = async (req, res) => {

    Parse.Cloud.useMasterKey();
    var user = new Parse.User();
    user.set("username", req.body.customer_name);
    user.set("password", req.body.password);
    user.set("email", req.body.email);
    user.set("nat_id",  req.body.nat_id);
    user.set("phone_num", req.body.phone_num);
    user.set('role', 'Customer')
    try {
      await user.signUp()
        .then((user)=>{
          res.render("customer/login", { msg: "Successfull Created Your Account. Now Log in." });
        })
        .catch((err)=>{
          _error(req, res, err)
        })    
    } catch (err) {
      _error(req, res, err);
    }
  };
  
login = async (req, res) => {
    Parse.Cloud.useMasterKey();
    try {
      await Parse.User.logIn(req.body.email, req.body.password)
        .then(user => {
          if (user) {
            Parse.User.enableUnsafeCurrentUser();
            Parse.User.become(user.getSessionToken()).then(
              function() {
                currentUser = Parse.User.current();
                if (currentUser != null) {
                  if(currentUser.get("role")==="Customer") {
                    res.render("customer/home", {
                      user: currentUser.get("username"),
                      role: currentUser.get("role")
                    })
                  }else{
                    res.redirect('/station')
                  }
                } else {
                  res.render("customer/login");
                }
              },
              function(error) {
                _error(req, res, error);
              }
            );
          }
        }).catch((err => {
          _error(req, res, err);
        }))
      
    } catch (error) {
      _error(req, res, error);
    }
};

  
function _error(req, res, error) {
    res.render("welcome", {
      err: error.message
    });
  }

module.exports = router;