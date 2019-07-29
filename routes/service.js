const express = require("express")
const router = express.Router()
const Parse = require("parse/node")
var currentUser = Parse.User.current()

router.get("/", (req, res) => {
  res.render("service-station");
})

router.get("/signup", function(req, res, next) {
  res.render("station-signup");
})

router.post("/signup", function(req, res, next) {
  signup(req, res);
})

router.get("/signin", (req, res) => {
  res.render("station-signin");
})

router.post("/signin", (req, res) => {
  login(req, res);
})

router.get("/log-out", (req, res) => {
  if(!currentUser) {
    return res.render('welcome', {err: 'Must login first'})
  }
  Parse.User.logOut().then(
    function() {
      res.redirect("/");
    },
    function(error) {
      _error(req, res, error);
    }
  );
})

router.get('/receive', (req, res) => {
  if(!currentUser) {
    return res.render('welcome', {msg: 'Must login first'})
  }
  res.render('fuel-receive', {
    user: currentUser.get("username"),
    role: currentUser.get("role")
  })
})

router.post('/receive', (req, res) => {
  receive(req, res)
})

router.get('/transactions/:station', (req, res)=>{
  if(!currentUser) {
    return res.render('welcome', {err: 'Must login first'})
  }
  const transactions = Parse.Object.extend('Transactions')
  let query = new Parse.Query(transactions)
  query.equalTo('station', req.params.station)
  query.find().then(results => {
    let trans = []
    results.forEach( result => {
      var obj = {
        id: result.id,
        buyer: result.get('buy'),
        station: result.get('station'),
        type: result.get('type'),
        cost: result.get('cost'),
        litres: result.get('litres'),
        collected: result.get('collected'),
        cancelled: result.get('cancelled')
      }
      trans.push(obj)
    })
    res.render('service_transactions', {user: currentUser.getUsername(), role: currentUser.get('role'), transactions: trans})
  })
})

router.get('/transactions/:station/:trans_id', (req, res)=>{
  if(!currentUser) {
    return res.render('welcome', {err: 'Must login first'})
  }
  res.render('collect', {user: currentUser.getUsername(), role: currentUser.get('role')})
})

router.post('/transactions/:station/:trans_id', (req, res)=>{
  const transactions = Parse.Object.extend('Transactions')
  let query = new Parse.Query(transactions)
  query.equalTo('objectId', req.params.trans_id)
  query.find().then(result => {
    result[0].set('collected', true)
    result[0].save().then(rs => {
      const transactions = Parse.Object.extend('Transactions')
      let query = new Parse.Query(transactions)
      query.equalTo('station', req.params.station)
      query.find().then(results => {
        let trans = []
        results.forEach( result => {
          var obj = {
            id: result.id,
            buyer: result.get('buy'),
            station: result.get('station'),
            type: result.get('type'),
            cost: result.get('cost'),
            litres: result.get('litres'),
            collected: result.get('collected'),
            cancelled: result.get('cancelled')
          }
          trans.push(obj)
        })
        res.render('service_transactions', {user: currentUser.getUsername(), role: currentUser.get('role'), transactions: trans})
      })
    }).catch(err=>{
      _error(req, res, err)
    })
  })
})

router.get('/transactions/:station/:trans_id/cancel', (req, res)=>{
  if(!currentUser) {
    return res.render('welcome', {err: 'Must login first'})
  }
  res.render('cancel', {user: currentUser.getUsername(), role: currentUser.get('role')})
})

router.post('/transactions/:station/:trans_id/cancel', (req, res)=>{
  const transactions = Parse.Object.extend('Transactions')
  let query = new Parse.Query(transactions)
  query.equalTo('objectId', req.params.trans_id)
  query.find().then(result => {
    result[0].destroy().then(rs => {
      const transactions = Parse.Object.extend('Transactions')
      let query = new Parse.Query(transactions)
      query.equalTo('station', req.params.station)
      query.find().then(results => {
        let trans = []
        results.forEach( result => {
          var obj = {
            id: result.id,
            buyer: result.get('buy'),
            station: result.get('station'),
            type: result.get('type'),
            cost: result.get('cost'),
            litres: result.get('litres'),
            collected: result.get('collected'),            
          }
          if(result.get("cancelled")){
            obj.cancelled = true
          }
          trans.push(obj)
        })
        res.render('service_transactions', {user: currentUser.getUsername(), role: currentUser.get('role'), transactions: trans})
      })
    }).catch(err=>{
      _error(req, res, err)
    })
  })
})

function receive(req, res) {
  if(!currentUser) {
    return res.render('welcome', {err: 'Must login first'})
  }
  const Received = new Parse.Object('Received')
  Received.set('station', currentUser.getUsername())
  Received.set('invoiceId', req.body.invoice_id)
  Received.set('type', req.body.type)
  Received.set('amount',  req.body.amount)
  Received.set('cost', req.body.cost)
  Received.save()
    .then((result) => {
      updateUser(req, res)
    })
    .catch((err)=>{
      _error(req, res, err)
    })
}

function updateUser(req, res) {
  
  let query = new Parse.Query(Parse.User)
  query.equalTo('username', currentUser.getUsername())
  query.find({useMasterKey: true})
    .then((user) =>{
      
      if (req.body.type === 'petrol') {
        user[0].set('petrol', req.body.amount )
      }
      else if (req.body.type === 'diesel') {
        user[0].set('diesel', req.body.amount )
      }
      else{
        return res.render('fuel-receive', {err: 'You did not specify the type of fuel received'})
      }
      user[0].save()
        .then(result=>{
          res.render('service-home', {
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

function _error(req, res, error) {
  res.render("welcome", {
    err: error.message
  });
}

async function signup(req, res) {
  console.log(req.body)

  Parse.Cloud.useMasterKey();
  var user = new Parse.User();
  user.set("username", req.body.s_s_name);
  user.set("password", req.body.password);
  user.set("email", req.body.email);
  user.set("general_manager",  req.body.g_manager);
  user.set("supervisor", req.body.supervisor);
  user.set('role', 'Station')
  try {
    await user.signUp()
      .then((user)=>{
        res.render("station-signin", { msg: "Successfull Added Your Service Station. Now Signin." });
      })
      .catch((err)=>{
        _error(req, res, err)
      })    
  } catch (err) {
    _error(req, res, err);
  }
};

async function login(req, res) { 
  Parse.Cloud.useMasterKey();
  try {
    await Parse.User.logIn(req.body.email, req.body.password)
      .then(user => {
        if (user) {
          Parse.User.enableUnsafeCurrentUser();
          Parse.User.become(user.getSessionToken()).then(() => {
              currentUser = Parse.User.current();
              if (currentUser != null) {
                if(currentUser.get("role")==="Station") {
                  res.render("service-home", {
                    user: currentUser.get("username"),
                    role: currentUser.get("role")
                  })
                }else{
                  res.render('customer/login', {
                    err: 'Click Home and login as a customer'
                  })
                }
              } else {
                res.render("station-signin");
              }
            },
            (error) => {
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

module.exports = router
