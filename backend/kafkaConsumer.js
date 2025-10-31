import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
import pool from './database.js';

dotenv.config();

const kafka = new Kafka({
  clientId: '4-in-a-row-analytics',
  brokers: [process.env.KAFKA_BROKER],
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

const consumer = kafka.consumer({ groupId: 'analytics-group' });

const run = async () => {
  try {
    await consumer.connect();
    console.log('✅ Kafka consumer connected');

    await consumer.subscribe({ topic: 'game-analytics', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        console.log('📊 Analytics Event:', event.eventType, event);

        // Store analytics in database or process metrics
        // You can add more sophisticated analytics here
      },
    });
  } catch (error) {
    console.error('❌ Kafka consumer error:', error);
  }
};

run();
