import { Activity } from 'react';
import { instance } from '../../lib/api/config';
import { createQueryReact } from '../../lib/react';
import $ from './styles.module.css';

const getPokemon = createQueryReact<PokemonWithSprites, { name: string }, { user: string; password: string }>({
  fetcher: async (params, postData) => {
    console.log('Post data:', postData);
    console.log('Params data:', params);
    const { data } = await instance.get(`pokemon/${params?.name}`);
    return data as any;
  },
  key: (params) => ['pokemon', `${params?.name}`],
  initialData: { name: 'Loading...', url: '', sprites: {} },
});

const getPokemons = createQueryReact<PokemonWithSprite[]>({
  key: () => ['pokemons'],
  fetcher: async () => {
    const { data } = await instance.get<PokemonListResponse>(`pokemon?offset=20&limit=20`);
    const detailed = await Promise.all(
      data.results.map(async (item) => {
        const res = await fetch(item.url);
        const pokemon = await res.json();
        return {
          name: item.name,
          url: item.url,
          sprite: pokemon.sprites.front_default ?? null,
        };
      })
    );

    return detailed;
  },
});

export default function QueryExample() {
  const pokemon = getPokemon.useQuery({ name: 'Pikachu' });
  const pokemons = getPokemons.useQuery();

  getPokemon.addOnSuccess(() => {
    console.log('Success!');
  });

  const setNewData = (name: string) => {
    getPokemon.setPostData({ password: '12345', user: 'test' });
    getPokemon.setParams({ name });
  };

  return (
    <div className={$.QueryExample}>
      <div className={$.CardCurr}>
        <Activity mode={pokemon.data?.sprites.back_shiny ? 'visible' : 'hidden'}>
          <div className={$.CardCurr_wrappers}>
            <img src={pokemon.data?.sprites.back_shiny!} />
            <img src={pokemon.data?.sprites.front_shiny!} />
          </div>
        </Activity>
        <span className={$.Card_img}>{pokemon.data?.name}</span>
      </div>
      <div className={$.grid}>
        {pokemons.data?.map(({ name, url, sprite }) => {
          return (
            <div key={url} className={$.Card} onClick={() => setNewData(name)}>
              <Activity mode={sprite ? 'visible' : 'hidden'}>
                <img src={sprite!} className={$.Card_img} />
              </Activity>
              <span className={$.Card_img}>{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PokemonListResponse {
  count: number;
  next: string;
  previous: string | null;
  results: PokemonListItem[];
}

interface PokemonListItem {
  name: string;
  url: string;
}

interface PokemonWithSprite extends PokemonListItem {
  sprite: string | null;
}

interface PokemonWithSprites extends PokemonListItem {
  sprites: {
    back_shiny?: string | null;
    front_shiny?: string | null;
  };
}
