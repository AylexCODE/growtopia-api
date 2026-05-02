const express = require('express');
const cors = require('cors');
const app = express();
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const maxLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 25,
    message: "Request limit exceeded"
});

app.use(cors());
app.use(express.json());
app.use(maxLimit);
app.set('trust proxy', 1);

const port = process.env.port || 8080;

app.get('/', (req, res) => {
    res.sendStatus(200);
});

app.get('/item', async (req, res) => {
    try{
        const itemName = req.query.q;
        
        const resultItems = await searchItem(itemName); console.log(resultItems);
        if(resultItems == 0) return res.sendStatus(404);
        
        const response = await axios({
            method: "GET",
            url: `https://growtopia.fandom.com/api.php?action=parse&page=${encodeURIComponent(resultItems[0].title)}`
        });
        console.log(response);
        res.sendStatus(200);
    }catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

app.get('/search', async (req, res) => {
    try{
        const itemName = req.query.q;

        const response = await searchItem(itemName);
        console.log(response);

        res.send(response);
    }catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

async function searchItem(itemName){
    const response = await axios({
        method: "GET",
        url: `https://growtopia.fandom.com/api.php?action=query&srlimit=20&list=search&srsearch=${itemName}&format=json`
    });

    return response.data.query.search.filter(item => item.title.toLowerCase().includes(itemName.toLocaleLowerCase()));
}

app.listen(port, () => {
    console.log(`Server is up and running at PORT: ${port}`);
});