const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec); // transforma în promisă

exports.handler = async (event, context) => {
  try {
    const scriptPath = path.join(__dirname, '../../test.js');
    console.log('Calea către script:', scriptPath);

    const { stdout, stderr } = await execPromise(`node ${scriptPath}`);

    console.log('stdout:', stdout);
    console.log('stderr:', stderr);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Scriptul a fost executat cu succes!', output: stdout }),
    };
  } catch (error) {
    console.error('Eroare la execuție:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Eroare la rularea scriptului', error: error.message }),
    };
  }
};
