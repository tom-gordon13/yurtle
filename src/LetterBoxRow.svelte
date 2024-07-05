<script>
  export let wordLength;
  export let wordToGuess;
  export let word;

  function decideClass(i, word, wordToGuess) {
    if (word[i] === wordToGuess[i]) {
      return "correct-letter";
    } else if (wordToGuess.includes(word[i])) {
      return "included-letter";
    }
  }
</script>

<div class="row-container">
  {#each Array.from({ length: wordLength }) as _, i}
    <div
      class="letter-box {word && word.length === wordLength
        ? decideClass(i, word, wordToGuess)
        : ''}"
    >
      {word && word.length > i ? word[i] : ""}
    </div>
  {/each}
</div>

<style>
  .row-container {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .letter-box {
    width: 40px;
    height: 40px;
    border: 1px solid black;
    margin: 4px 2px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .correct-letter {
    background-color: rgb(96, 221, 58);
  }

  .included-letter {
    background-color: yellow;
  }
</style>
