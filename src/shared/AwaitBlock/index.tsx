import { Await, AwaitGlobal, useAwaitRef } from "../../lib/_stm/react/Await";


function fetchPokemon(name: string) {
  return async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!res.ok) throw new Error(`Failed to load pokemon ${name}`);
        const data = await res.json();

        resolve(data);
        // setTimeout(() => resolve(data), 1000);
      } catch (err) {
        reject(err);
      }
    });
  };
}

export function AwaitBlock({ name }: { name: string }) {
  const api = useAwaitRef<PokemonListResponse>();


  return (
    <div>
      <button onClick={() => api?.run('pikachu')}>Load Pikachu</button>
      <button onClick={() => api?.run('bulbasaur')}>Load Bulbasaur</button>
      <button onClick={() => api?.run('charmander')}>Load charmander</button>
      <button onClick={() => api?.run('squirtle')}>Load eevee</button>
      <button onClick={() => api?.run('jigglypuff')}>Load psyduck</button>
      <button onClick={() => api?.run('snorlax')}>Load mew</button>
      <button onClick={() => api?.run('gengar')}>Load gengar</button>
      <button onClick={() => api?.run('23')}>аыва gengar</button>

      <button onClick={() => AwaitGlobal.invalidate('lol', ['bulbasaur'])}>invalidate</button>

      <Await ref={api?.ref} from={fetchPokemon} params={[name, 'lol']} isOptimistic>
        <Await.Pending>Loading...</Await.Pending>
        <Await.Then  >
          {(data: PokemonListItem) => (
            <div>
              <h2>{data.name}</h2>
              <img src={data.sprites.front_default} alt={data.name} />
              <p>Height: {data.height}</p>
              <p>Weight: {data.weight}</p>
            </div>
          )}
        </Await.Then>

        <Await.Catch>{(err) => <p style={{ color: 'red' }}>{err.message}</p>}</Await.Catch>
      </Await>

      <Await ref={api?.ref} from={fetchPokemon} params={[name, 'lol1']} >
        <Await.Pending>Loading...</Await.Pending>
        <Await.Then>
          {(data: PokemonListItem) => (
            <div>
              <h2>{data.name}</h2>
              <img src={data.sprites.front_default} alt={data.name} />
              <p>Height: {data.height}</p>
              <p>Weight: {data.weight}</p>
            </div>
          )}
        </Await.Then>

        <Await.Catch>{(err) => <p style={{ color: 'red' }}>{err.message}</p>}</Await.Catch>
      </Await>
    </div>
  );
}
interface PokemonListResponse {
  data: PokemonListItem;
}

interface PokemonListItem {
  name: string;
  url: string;
  height: number;
  weight: number;
  sprites: {
    back_shiny: string;
    front_shiny: string;
    front_default: string;
  };
}
