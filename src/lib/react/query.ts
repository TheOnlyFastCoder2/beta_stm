// import type { ReactStore } from "./types";
// import type { LocalState, QueryInstance } from "../stm/lib/query";
// import createReactStore from ".";

// import { createQuery, type QueryOptions } from "../stm/lib/query";
// export interface ReactQueryInstance<TData>
//   extends ReactStore<LocalState<TData>>



// export default function createReactQuery<TData, TParams = void>(
//   options: QueryOptions<TData, TParams>
// ): ReactStore<QueryInstance<TData, TParams>> {
//   const query:QueryInstance<TData, TParams> = createQuery<TData, TParams>(options);
//   const store: = createReactStore(query as any);

//   store.use = () => { 
//     store.useField(($) => $.current)
//     return 
//   }

//   return store as any; 
// }
