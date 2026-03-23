import Express  = require("express");
const app = Express();

app.get("/", (req ,res)=>{
    res.send("hello world")
});

app.listen(4009,()=>{
    console.log("server is running on port 4009");
})
