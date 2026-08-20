import masterItems from '../../src/data/masterItems.json';

export const onRequestGet = async () => new Response(
  JSON.stringify({
    itemIds: masterItems.map((item) => item.id),
    generatedAt: Date.now(),
  }),
  {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=900',
    },
  },
);
