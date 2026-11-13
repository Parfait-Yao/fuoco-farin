const u = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMAGES = {
  hero: u('photo-1513104890138-7c749659a591', 1800),
  oven: u('photo-1555396273-367ea4eb4db5', 1600),
  chef: u('photo-1556761223-4c4282c73f77', 1200),
  dough: u('photo-1571066811602-716837d681de', 1200),
  delivery: u('photo-1526367790999-0150786686a2', 1200),
  pizzas: [
    u('photo-1604382355076-af4b0eb60143'),
    u('photo-1628840042765-356cda07504e'),
    u('photo-1593560708920-61dd98c46a4e'),
    u('photo-1573821663912-569905455b1c'),
    u('photo-1544982503-9f984c14501a'),
    u('photo-1565299624946-b28f40a0ae38'),
    u('photo-1534308983496-4fabb1a015ee'),
    u('photo-1574071318508-1cdbab80d002'),
    u('photo-1571407970349-bc81e7e96d47'),
    u('photo-1590947132387-155cc02f3212'),
    u('photo-1595854341625-f33ee10dbf94'),
    u('photo-1513104890138-7c749659a591'),
  ],
};

export const FALLBACK_IMAGE = '/images/pizza-fallback.svg';
