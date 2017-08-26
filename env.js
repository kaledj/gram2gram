const load_envvar = (name) => {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Error: ${name} not defined in environment.`);
  }
  return val;
}

module.exports = load_envvar;
