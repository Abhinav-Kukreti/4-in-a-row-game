import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

let producer = null;

// Initialize Kafka producer
const initKafka = async () => {
  try {
    if (!process.env.KAFKA_BROKER) {
      console.log('⚠️ Kafka not configured, skipping analytics');
      return null;
    }

    const kafka = new Kafka({
      clientId: '4-in-a-row-game',
      brokers: [process.env.KAFKA_BROKER],
      ssl: true,
      sasl: {
        mechanism: 'scram-sha-256',
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
      },
    });

    producer = kafka.producer();
    await producer.connect();
    console.log('✅ Kafka producer connected');
    return producer;
  } catch (error) {
    console.error('❌ Kafka connection failed:', error.message);
    return null;
  }
};

// Send event to Kafka
export const sendGameEvent = async (eventType, data) => {
  try {
    if (!producer) {
      await initKafka();
    }

    if (producer) {
      await producer.send({
        topic: 'game-analytics',
        messages: [{
          key: eventType,
          value: JSON.stringify({
            eventType,
            timestamp: Date.now(),
            ...data,
          }),
        }],
      });
    }
  } catch (error) {
    console.error('Kafka send error:', error.message);
  }
};

export default initKafka;
