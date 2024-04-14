import amqp from 'amqplib'
import dotenv from 'dotenv'

dotenv.config()

async function consumeMessages() {

const options = {
    vhost: process.env.AMQP_VHOST,
    username: process.env.AMQP_USERNAME,
    password: process.env.AMQP_PASSWORD,
    port: process.env.AMQP_PORT,
}

const  url = process.env.AMQP_URL || "";
 const queue = process.env.AMQP_QUEUE || ""

  const connection = await amqp.connect(url, options);
  const channel = await connection.createChannel();

  await channel.assertQueue(queue, { durable: true });

  console.log(`Escuchando mensajes en la cola ${queue}`);

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      try {
        await enviarMensajeALaAPI(msg.content.toString());
        console.log('Mensaje enviado a la API:', msg.content.toString());

        channel.ack(msg);
      } catch (error) {
        console.error('Error al procesar el mensaje:', error);
        channel.reject(msg, false);
      }
    }
  });
}

async function enviarMensajeALaAPI(message: any) {
  const apiUrl = 'http://localhost:4000/reportes';
  const messageJSON = JSON.parse(message);
  
  const imagen = await getImagen();

  const reporte = {
    imagen: imagen,
    idKit: messageJSON.idKit,
    correo: messageJSON.correo,
    magnetico: false,
    movimiento: false,
    camara: true
  }
  switch(messageJSON.sensorActivado) {
    case 'Magnetico':
      reporte.magnetico = true;
      break;
    case 'movimiento':
      reporte.movimiento = true;
      break;
  }

  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reporte }),
  };

  console.log(requestOptions.body)

  const response = await fetch(apiUrl, requestOptions);
  if (!response.ok) {
    throw new Error(`Error al enviar mensaje a la API: ${response.status} - ${response.statusText}`);
  }
}


async function getImagen() {
  const requestOptions = {
    method: 'GET',
    headers: { 'Content-Type': 'text/plain' },
  };
  const response = await fetch("http://192.168.100.62/", requestOptions);
  if (!response.ok) {
    throw new Error(`Error al enviar mensaje a la API: ${response.status} - ${response.statusText}`);
  }

  return response.text();
}

consumeMessages().catch(console.error);
