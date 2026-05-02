const express = require('express');
const cors = require('cors');
const app = express();
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const { load } = require('cheerio');

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
            url: `https://growtopia.fandom.com/api.php?action=parse&page=${encodeURIComponent(resultItems[0].title)}&&format=json`
        });
        const html = load(response.data.parse.text["*"]);

        const description = html(".card-text").first().text().trim();
        const properties = html("#mw-content-text > div > div.gtw-card.item-card > div:nth-child(4)").text().trim().split(/[\.+\!]/).filter((d) => d !== "");
        const sprite = html("div.card-header .growsprite > img").attr("src");
        const color = html(".seedColor > div").text().trim()?.split(" ");
        const rarity = html(".card-header b > small").text().match(/(\d+)/);
        const recipe = html(".recipebox table.content").last().text().trim().split(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/).map((el) => el.trim());
        const splice = html(".bg-splice").text();
        const info = html("#mw-content-text > div > p:nth-child(3)").text().trim();
        const type = html("table.card-field tr:nth-child(1) > td").text().split(" ").pop();

        res.send({
            description, properties, sprite, color, rarity, recipe, splice, info, type
        });
    }catch(e){
        console.log(e);
        res.sendStatus(500);
    }
});

app.get('/search', async (req, res) => {
    try{
        const itemName = req.query.q;

        const response = await searchItem(itemName);

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