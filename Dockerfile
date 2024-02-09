FROM node:latest

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY Benchmarks/TimeScaleBenchMark.js .

EXPOSE 3000
CMD [ "node", "TimeScaleBenchMark.js" ]