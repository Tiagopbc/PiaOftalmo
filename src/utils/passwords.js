const PASSWORD_GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%&*?'
];

const PASSWORD_ALPHABET = PASSWORD_GROUPS.join('');

const secureRandomIndex = (size) => {
  const values = new Uint32Array(1);
  const maximum = Math.floor(0x100000000 / size) * size;

  do {
    crypto.getRandomValues(values);
  } while (values[0] >= maximum);

  return values[0] % size;
};

const randomCharacter = (characters) =>
  characters[secureRandomIndex(characters.length)];

export const generateTemporaryPassword = (length = 14) => {
  if (length < 8) {
    throw new Error('A senha temporária deve ter pelo menos 8 caracteres.');
  }

  const characters = PASSWORD_GROUPS.map(randomCharacter);
  while (characters.length < length) {
    characters.push(randomCharacter(PASSWORD_ALPHABET));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
};
