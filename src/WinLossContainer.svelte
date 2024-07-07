<script>
    import { onMount, onDestroy } from "svelte";

    export let gameState;
    export let handleReset;

    function handleKeydown(event) {
        if (gameState && event.key === "Enter") {
            handleReset();
        }
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeydown);
    });
</script>

<div class="win-loss-container">
    {#if gameState}
        {#if gameState === "win"}
            <div class="win-lose-message">You win! :D</div>
        {:else if gameState === "lose"}
            <div class="win-lose-message">You lose! :(</div>
        {/if}
        <button class="play-again-button" on:click={handleReset}
            >Play Again</button
        >
    {/if}
</div>

<style>
    .win-loss-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    .win-lose-message {
        font-size: larger;
    }

    .play-again-button {
        margin-top: 1rem;
    }
</style>
