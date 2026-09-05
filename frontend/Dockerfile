FROM node:20-alpine

WORKDIR /app

# Copiar definicion de dependencias
COPY package*.json ./

# Instalar dependencias limpias
RUN npm install

# Copiar el codigo fuente de la aplicacion
COPY . .

# Exponer el puerto de desarrollo de Angular
EXPOSE 4200

# Iniciar servidor de desarrollo enlazando a todas las interfaces de red
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]
