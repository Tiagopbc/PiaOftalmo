const PASSWORD_GROUPS = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%&*?'
];

const PASSWORD_ALPHABET = PASSWORD_GROUPS.join('');

export const PASSWORD_POLICY_MESSAGE =
  'Use pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e símbolo.';

const PASSWORD_REQUIREMENT_DEFINITIONS = [
  {
    id: 'length',
    label: '8 caracteres ou mais',
    test: (password) => password.length >= 8
  },
  {
    id: 'uppercase',
    label: 'Uma letra maiúscula',
    test: (password) => /[A-Z]/.test(password)
  },
  {
    id: 'lowercase',
    label: 'Uma letra minúscula',
    test: (password) => /[a-z]/.test(password)
  },
  {
    id: 'number',
    label: 'Um número',
    test: (password) => /[0-9]/.test(password)
  },
  {
    id: 'symbol',
    label: 'Um símbolo',
    test: (password) => /[!-/:-@[-`{-~]/.test(password)
  }
];

export const getPasswordRequirements = (password = '') =>
  PASSWORD_REQUIREMENT_DEFINITIONS.map((requirement) => ({
    id: requirement.id,
    label: requirement.label,
    met: requirement.test(password)
  }));

export const isStrongPassword = (password = '') =>
  getPasswordRequirements(password).every((requirement) => requirement.met);

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

export const generateTemporaryPassword = (length = 16) => {
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
