const { exec } = require('child_process');
const path = require('path');

exports.handler = async (event, context) => {
  try {
    // Execută scriptul tău aici (test.js)
    const scriptPath = path.join(__dirname, 'test.js');
    exec(`node ${scriptPath}`, (err, stdout, stderr) => {
      if (err) {
        console.error('Error:', err);
        return { statusCode: 500, body: 'Error executing script' };
      }
      console.log(stdout);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Scriptul a fost executat cu succes!' }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: 'Eroare la rularea scriptului' };
  }
};