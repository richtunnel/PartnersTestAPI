#!/bin/bash
# deploy-resources.sh - Create all Azure resources

set -e

# Configuration - UPDATE THESE VALUES
RESOURCE_GROUP="DefaultResourceGroup-EUS"
LOCATION="eastus"
STORAGE_ACCOUNT="partnerslegaldocsstorage$(date +%s)"
FUNCTION_APP="bus-to-partners-document-api"
SERVICE_BUS_NAMESPACE="bus-to-partners-document-api"
QUEUE_NAME="queue-to-partners-document-api"
BLOB_CONTAINER="legal-documents"

echo "Creating Azure resources..."
echo "Resource Group: $RESOURCE_GROUP"
echo "Function App: $FUNCTION_APP"
echo "Location: $LOCATION"

# Create resource group
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account for Functions runtime
echo "Creating storage account..."
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS

# Create Service Bus namespace
echo "Creating Service Bus namespace..."
az servicebus namespace create \
  --name $SERVICE_BUS_NAMESPACE \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard

# Create Service Bus queue
echo "Creating Service Bus queue..."
az servicebus queue create \
  --namespace-name $SERVICE_BUS_NAMESPACE \
  --resource-group $RESOURCE_GROUP \
  --name $QUEUE_NAME \
  --max-delivery-count 5 \
  --lock-duration PT5M \
  --default-message-time-to-live P14D

# Create Function App
echo "Creating Function App..."
az functionapp create \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT \
  --consumption-plan-location $LOCATION \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --disable-app-insights false

# Get connection strings
echo "Getting connection strings..."

SERVICE_BUS_CONNECTION=$(az servicebus namespace authorization-rule keys list \
  --resource-group $RESOURCE_GROUP \
  --namespace-name $SERVICE_BUS_NAMESPACE \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString -o tsv)

STORAGE_CONNECTION=$(az storage account show-connection-string \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv)

# Configure Function App settings
echo "Configuring Function App settings..."
az functionapp config appsettings set \
  --name $FUNCTION_APP \
  --resource-group $RESOURCE_GROUP \
  --settings \
    "AZURE_SERVICE_BUS_CONNECTION_STRING=$SERVICE_BUS_CONNECTION" \
    "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION" \
    "QUEUE_NAME=$QUEUE_NAME" \
    "BLOB_CONTAINER_NAME=$BLOB_CONTAINER" \
    "ALLOWED_ORIGINS=*" \
    "NODE_ENV=production" \
    "WEBSITE_NODE_DEFAULT_VERSION=18-lts"

# Create blob container
echo "Creating blob container..."
az storage container create \
  --name $BLOB_CONTAINER \
  --account-name $STORAGE_ACCOUNT \
  --connection-string "$STORAGE_CONNECTION" \
  --public-access off

echo "Resources created successfully!"
echo ""
echo "Resource Summary:"
echo " Resource Group: $RESOURCE_GROUP"
echo " Function App: $FUNCTION_APP"
echo " Service Bus: $SERVICE_BUS_NAMESPACE"
echo " Queue: $QUEUE_NAME"
echo " Storage: $STORAGE_ACCOUNT"
echo " Container: $BLOB_CONTAINER"
echo ""
echo "Function App URL: https://$FUNCTION_APP.azurewebsites.net"
echo ""
echo "Connection Strings:"
echo "Service Bus: $SERVICE_BUS_CONNECTION"
echo "Storage: $STORAGE_CONNECTION"