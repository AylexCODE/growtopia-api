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
        
        const response = await axios({
            method: "GET",
            url: `https://growtopia.fandom.com/api.php?action=parse&page=${encodeURIComponent(itemName)}&&format=json`
        });
        const html = load(response.data.parse.text["*"]);

        const description = html(".card-text").first().text().trim();
        let properties = html('.card-title:contains("Properties")')
            .next('.card-text')
            .html();
        properties = properties ? properties.split(/<br\s*\/?>/i).map(str => html(`<span>${str}</span>`).text().trim()).filter(text => text.length > 0) : [];
        const icon = html("div.card-header .growsprite > img").attr("src");
        const seedColor = html(".seedColor > div").text().trim()?.split(" ");
        const rarity = html(".gtw-card .card-header b > small").text().match(/\d+/);
        const recipe = [];
        html('table.content span.seed').each((i, el) => {
            const imgSrc = html(el).find('img').attr('src');
            const anchor = html(el).next('a');

            recipe.push({
                img: imgSrc,
                text: anchor.text().trim()
            });
        });

        const info = html(".mw-content-ltr > p").first().text().trim();
        const type = html("table.card-field tr:nth-child(1) > td").text().split(" ").pop();
        const chi = html("table.card-field tr:nth-child(2) > td").text().split(" ").pop();
        const growTime = html("table.card-field tr:nth-child(7) > td").text().split(" ").join(" ").trim();
        const gemsDrop = html("table.card-field tr:nth-child(8) > td").text().split(" ").join(" ").trim();
        const hits = html("table.card-field tr:nth-child(5) > td").clone().find("small").remove().end().text().match(/\d+(?=\sHits)/g).map(Number); 
        const restoresAfter = html("table.card-field tr:nth-child(5) > td > small").text().split(" ").join(" ").trim();

        res.send({
            description, properties, icon, rarity, recipe, info, data: {
                type, chi, growTime, gemsDrop, hardness: {
                    hits, restoresAfter
                }, seedColor
            }
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