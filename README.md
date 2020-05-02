# Rocket.Chat.App-Jackett

Interact with your Jackett Server.

## Configuration

### Customize Magnet Handler
For search results, a "Magnet Handler" action is provided. The action will post the text in this field to the user's input box, followed by the magnet link. This is useful for integrating with applications such as Rocket.Chat.App-Put.io, where the command can be `/putio-add`

## Docker
A Dockerfile and docker-compose are provided.

Build the docker image and run it to deploy to your server:
`docker build -t rocketchatapp_jackett . && docker run -it --rm -e URL=YOUR_SERVER -e USERNAME=YOUR_USERNAME -e PASSWORD=YOUR_PASSWORD rocketchatapp_jackett`

Build the docker image and run docker-compose to deploy to your server:
`docker build -t rocketchatapp_jackett . && docker-compose run --rm -e URL=YOUR_SERVER -e USERNAME=YOUR_USERNAME -e PASSWORD=YOUR_PASSWORD rocketchatapp_jackett`