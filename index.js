const express = require('express');
const { json } = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio')
// Begin Server
const app = express();

app.use(express.static('build'))

const sportotoUrl = `https://www.nesine.com/sportoto`
const tutturUrl = 'https://tapi.tuttur.com/v1/event/bulletin/1'
// Middlewares
app.use(json());
app.use(cors());
//Sportoto API
const getSportoto = () => {
  return axios.get(sportotoUrl)
}
const getTutturGames = () => {
  return axios.get(tutturUrl)
}

function compareTwoStrings(first, second) {
  first = first.replace(/\s+/g, '')
  second = second.replace(/\s+/g, '')

  if (!first.length && !second.length) return 1;                   // if both are empty strings
  if (!first.length || !second.length) return 0;                   // if only one is empty string
  if (first === second) return 1;       							 // identical
  if (first.length === 1 && second.length === 1) return 0;         // both are 1-letter strings
  if (first.length < 2 || second.length < 2) return 0;			 // if either is a 1-letter string

  let firstBigrams = new Map();
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.substr(i, 2);
    const count = firstBigrams.has(bigram)
      ? firstBigrams.get(bigram) + 1
      : 1;

    firstBigrams.set(bigram, count);
  };

  let intersectionSize = 0;
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.substr(i, 2);
    const count = firstBigrams.has(bigram)
      ? firstBigrams.get(bigram)
      : 0;

    if (count > 0) {
      firstBigrams.set(bigram, count - 1);
      intersectionSize++;
    }
  }

  return (2.0 * intersectionSize) / (first.length + second.length - 2);
}

app.get('/api/sportoto', (req, response, next) => {

  axios.all([getSportoto(), getTutturGames()])
    .then(axios.spread(function (acct, perms) {
      let tutturGames = perms.data
      let sportotoGames = []
      const $ = cheerio.load(acct.data)
      $('table.table.table-bordered.sportoto-table.sportoto-program tbody tr td span.event-name').each((index, element) => {
        const game = $(element).text().trim()
        sportotoGames[index] = { game }
      })
      const allGamesNames = tutturGames.data.map(m => m.name.toLowerCase())
      const sportotoGamesNames = sportotoGames.map(m => m.game.toLowerCase())

      let realName = []

      for (let i = 0; i < allGamesNames.length; i++) {
        for (let j = 0; j < sportotoGamesNames.length; j++) {
          if (compareTwoStrings(tutturGames.data.map(m => m.name.toLowerCase())[i], sportotoGamesNames[j]) > 0.54 && tutturGames.data.filter(m => m.leagueName !== "UEFA Şampiyonlar Ligi Eleme Turu")) {

            realName.push(tutturGames.data[i])

            realName.filter(function (item, pos, self) {
              return self.indexOf(item) == pos;
            })
          }
        }
      }

      response.status(200).send(realName.reduce(function (acc, game) {  
        let markets = Object.keys(game.markets).map(i => game.markets[i])        
          for (let i = 0; i < markets.length; i++) {
            if (markets[i].name === "Maç Sonucu") {
            const finalObj = { ...acc, ["name"]: { ["name"]: `${game.name}`, ["odds"]: markets[i].odds } }
            return Object.keys(finalObj).map(i => finalObj[i])
            }
          }
      }, {})
      )
    }))

})


const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})