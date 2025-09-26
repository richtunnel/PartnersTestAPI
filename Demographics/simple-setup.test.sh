#!/bin/bash
# Azure Service Bus Queue Setup Script

# Variables (UPDATE THESE)
RESOURCE_GROUP="your-resource-group"
SERVICE_BUS_NAMESPACE="your-servicebus-namespace"
SUBSCRIPTION_ID="your-subscription-id"

echo "🚌 Setting up Service Bus Queues for Demographics API"
echo "Resource Group: $RESOURCE_GROUP"
echo "Service Bus: $SERVICE_BUS_NAMESPACE"
echo ""

# Set subscription
az account set --subscription $SUBSCRIPTION_ID

# Create FIFO Queues with Sessions (for ordered processing per law firm)
echo "📋 Creating FIFO queues with sessions..."

# Demographics Processing Queue (FIFO with sessions)
az servicebus queue create \
  --resource-group $RESOURCE_GROUP \
  --namespace-name $SERVICE_BUS_NAMESPACE \
  --name "demographics-processing-fifo" \
  --requires-session true \
  --enable-duplicate-detection true \
  --duplicate-detection-history-time-window PT10M \
  --max-delivery-count 5 \
  --lock-duration PT5M \
  --max-size-in-megabytes 5120

# Webhook Notifications Queue (FIFO with sessions)
az servicebus queue create \
  --resource-group $RESOURCE_GROUP \
  --namespace-name $SERVICE_BUS_NAMESPACE \
  --name "webhook-notifications-fifo" \
  --requires-session true \
  --enable-duplicate-detection true \
  --duplicate-detection-history-time-window PT10M \
  --max-delivery-count 3 \
  --lock-duration PT2M \
  --max-size-in-megabytes 1024

# Document Processing Queue (High throughput, no sessions)
az servicebus queue create \
  --resource-group $RESOURCE_GROUP \
  --namespace-name $SERVICE_BUS_NAMESPACE \
  --name "document-processing" \
  --enable-partitioning true \
  --max-delivery-count 3 \
  --lock-duration PT5M \
  --max-size-in-megabytes 2048

# Batch Processing Queue (High throughput)
az servicebus queue create \
  --resource-group $RESOURCE_GROUP \
  --namespace-name $SERVICE_BUS_NAMESPACE \
  --name "demographics-batch-processing" \
  --enable-partitioning true \
  --max-delivery-count 5 \
  --lock-duration PT10M \
  --max-size-in-megabytes 5120

# Dead Letter Queue
az servicebus queue create \
  --resource-group $RESOURCE_GROUP \
  --namespace-name $SERVICE_BUS_NAMESPACE \
  --name "dead-letter-processing" \
  --max-delivery-count 1 \
  --lock-duration PT10M \
  --max-size-in-megabytes 1024