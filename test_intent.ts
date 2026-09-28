import { queryGemmaNano } from './src/services/gemmaNanoEngine.ts';

async function test() {
  const result = await queryGemmaNano("Quali supermercati hanno offerte?", [], "Davide");
  console.log(result);
}
test();
