function createDeck(cardData) {
  const deck = []

  cardData.forEach((card) => {
    for (let index = 0; index < card.count; index += 1) {
      deck.push({
        ...card,
        color: card.colors[index],
        instanceId: `${card.id}-${index + 1}`
      })
    }
  })

  return deck
}

function shuffleDeck(deck) {
  const shuffled = deck.slice()

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const currentCard = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = currentCard
  }

  return shuffled
}

function drawCards(deck, count) {
  const remainingDeck = deck.slice()
  const drawnCards = remainingDeck.splice(0, count)

  return {
    drawnCards,
    deck: remainingDeck
  }
}

function getTopDiscardCard(discardPile) {
  if (!discardPile.length) {
    return null
  }

  return discardPile[discardPile.length - 1]
}

function getAllScoringCards(player) {
  const playedCards = (player.playedPairs || []).reduce((result, pair) => {
    return result.concat(pair.cards || [])
  }, [])

  return (player.hand || []).concat(playedCards)
}

function countCardsById(cards) {
  return cards.reduce((counts, card) => {
    counts[card.id] = (counts[card.id] || 0) + 1
    return counts
  }, {})
}

function calculateColorBonus(cards, bonusCount) {
  const colorCounts = cards.reduce((counts, card) => {
    counts[card.color] = (counts[card.color] || 0) + 1
    return counts
  }, {})

  return Object.keys(colorCounts)
    .map((color) => colorCounts[color])
    .sort((a, b) => b - a)
    .slice(0, bonusCount)
    .reduce((total, count) => total + count, 0)
}

function calculateCardScore(player) {
  const allCards = getAllScoringCards(player)
  const counts = countCardsById(allCards)
  const shellScores = [0, 0, 2, 4, 6, 8, 10]
  const octopusScores = [0, 0, 3, 6, 9, 12]
  const penguinScores = [0, 1, 3, 5]
  const sailorScores = [0, 0, 5]
  let score = 0

  score += Math.floor((counts.crab || 0) / 2)
  score += Math.floor((counts.boat || 0) / 2)
  score += Math.floor((counts.fish || 0) / 2)
  score += Math.min(counts.shark || 0, counts.swimmer || 0)
  score += shellScores[Math.min(counts.shell || 0, 6)] || 0
  score += octopusScores[Math.min(counts.octopus || 0, 5)] || 0
  score += penguinScores[Math.min(counts.penguin || 0, 3)] || 0
  score += sailorScores[Math.min(counts.sailor || 0, 2)] || 0
  score += (counts.lighthouse || 0) * (counts.boat || 0)
  score += (counts.shoal || 0) * (counts.fish || 0)
  score += (counts.penguinColony || 0) * 2 * (counts.penguin || 0)
  score += (counts.captain || 0) * 3 * (counts.sailor || 0)
  score += calculateColorBonus(allCards, counts.mermaid || 0)

  return score
}

function calculateCallColorBonus(player) {
  return calculateColorBonus(getAllScoringCards(player), 1)
}

function findPlayablePair(hand) {
  const sameNameDuoIds = ['crab', 'boat', 'fish']
  for (let index = 0; index < hand.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < hand.length; nextIndex += 1) {
      const firstCard = hand[index]
      const secondCard = hand[nextIndex]

      if (sameNameDuoIds.indexOf(firstCard.id) >= 0 && firstCard.id === secondCard.id) {
        return [index, nextIndex]
      }
      if (
        (firstCard.id === 'shark' && secondCard.id === 'swimmer') ||
        (firstCard.id === 'swimmer' && secondCard.id === 'shark')
      ) {
        return [index, nextIndex]
      }
    }
  }

  return null
}

function getPairType(firstCard, secondCard) {
  if (!firstCard || !secondCard) return ''
  if (firstCard.id === secondCard.id && ['crab', 'boat', 'fish'].indexOf(firstCard.id) >= 0) {
    return firstCard.id
  }
  if (
    (firstCard.id === 'shark' && secondCard.id === 'swimmer') ||
    (firstCard.id === 'swimmer' && secondCard.id === 'shark')
  ) {
    return 'sharkSwimmer'
  }
  return ''
}

module.exports = {
  createDeck,
  shuffleDeck,
  drawCards,
  getTopDiscardCard,
  getAllScoringCards,
  calculateCardScore,
  calculateCallColorBonus,
  findPlayablePair,
  getPairType
}
