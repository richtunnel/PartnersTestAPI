require('dotenv').config();
const { ServiceBusAdministrationClient } = require('@azure/service-bus');

async function setupServiceBusQueues() {
  console.log('Setting up Azure Service Bus Queues');
  console.log('=' .repeat(50));

  const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING;
  console.log('Loaded SERVICE_BUS_CONNECTION_STRING:', connectionString);
  if (!connectionString || connectionString === 'mock_connection_string') {
    console.log('Please update SERVICE_BUS_CONNECTION_STRING in .env file');
    console.log('   Get it from: Azure Portal → Service Bus → Shared access policies → RootManageSharedAccessKey');
    process.exit(1);
  }

  try {
    const adminClient = new ServiceBusAdministrationClient(connectionString);
    
    console.log('Connected to Azure Service Bus');
    console.log(`   Namespace: ${connectionString.match(/Endpoint=sb:\/\/([^.]+)/)?.[1]}.servicebus.windows.net\n`);

    // Define queues needed for the application
    const queues = [
      {
        name: 'demographics-processing-fifo',
        options: {
          requiresSession: true, // FIFO with sessions
          duplicateDetectionHistoryTimeWindow: 'PT10M', // 10 minutes
          enableBatchedOperations: true,
          maxDeliveryCount: 3,
          lockDuration: 'PT5M', // 5 minutes
          maxSizeInMegabytes: 5120,
        }
      },
      {
        name: 'webhook-notifications-fifo', 
        options: {
          requiresSession: true, // FIFO with sessions
          duplicateDetectionHistoryTimeWindow: 'PT10M',
          enableBatchedOperations: true,
          maxDeliveryCount: 5,
          lockDuration: 'PT2M', // 2 minutes
          maxSizeInMegabytes: 1024,
        }
      },
      {
        name: 'document-processing',
        options: {
          requiresSession: false, // High throughput, non-FIFO
          enablePartitioning: true,
          enableBatchedOperations: true,
          maxDeliveryCount: 3,
          lockDuration: 'PT5M',
          maxSizeInMegabytes: 2048,
        }
      },
      {
        name: 'demographics-batch-processing',
        options: {
          requiresSession: false,
          enablePartitioning: true,
          enableBatchedOperations: true,
          maxDeliveryCount: 3,
          lockDuration: 'PT10M', // Longer processing time
          maxSizeInMegabytes: 5120,
        }
      }
    ];

    for (const queue of queues) {
      try {
        console.log(`📝 Creating queue: ${queue.name}`);
        
        // Check if queue exists
        const exists = await adminClient.queueExists(queue.name);
        
        if (exists) {
          console.log(`  Queue already exists: ${queue.name}`);
          
          // Get queue properties
          const properties = await adminClient.getQueue(queue.name);
          console.log(`      - Session enabled: ${properties.requiresSession}`);
          console.log(`      - Max delivery count: ${properties.maxDeliveryCount}`);
          console.log(`      - Lock duration: ${properties.lockDuration}`);
        } else {
          // Create the queue
          await adminClient.createQueue(queue.name, queue.options);
          console.log(`  Created queue: ${queue.name}`);
          console.log(`      - Session enabled: ${queue.options.requiresSession}`);
          console.log(`      - Max delivery count: ${queue.options.maxDeliveryCount}`);
        }
        
      } catch (error) {
        console.log(`   Failed to create ${queue.name}: ${error.message}`);
      }
    }

    console.log('\n📊 Queue Status Summary:');
    for (const queue of queues) {
      try {
        const exists = await adminClient.queueExists(queue.name);
        if (exists) {
          const runtime = await adminClient.getQueueRuntimeProperties(queue.name);
          console.log(`   ${queue.name}:`);
          console.log(`     - Status: Ready`);
          console.log(`     - Active messages: ${runtime.activeMessageCount}`);
          console.log(`     - Dead letter messages: ${runtime.deadLetterMessageCount}`);
        }
      } catch (error) {
        console.log(`   ${queue.name}: Error getting status`);
      }
    }

    console.log('\n Azure Service Bus setup complete!');
    console.log('\nNext steps:');
    console.log('1. Start your application: npm run dev');
    console.log('2. Test with Postman using the collection below');
    console.log('3. Watch queue messages in Azure Portal');

  } catch (error) {
    console.log('Service Bus setup failed:', error.message);
    
    if (error.message.includes('unauthorized')) {
      console.log('\nFix: Check your connection string permissions');
      console.log('   Make sure you\'re using RootManageSharedAccessKey');
    } else if (error.message.includes('not found')) {
      console.log('\nFix: Check your Service Bus namespace name');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  setupServiceBusQueues().catch(console.error);
}