# Introdução
Nesse artigo vou mostrar o básico de como eu venho estruturando meus projetos C++ com o CMake, e também algumas dicas.

## CMakeLists.txt - o "requirements.txt" do C++
Todo projeto CMake ele precisa conter esse arquivo `CMakeLists.txt` exatamente como está escrito, ele é o arquivo de instruções sobre: o que é o projeto, descrição, versionamento, como vai especificar os links e entre outras features que o CMake proporciona.

Caso queira saber mais, dá uma olhada nessa [documentação da ferramenta](https://cmake.org/cmake/help/latest/).

## Estruturação do arquivo raíz
Pra começar uma estrutura básica nós podemos escrever sobre o que é o projeto em si.
```cmake
cmake_minimum_required(VERSION 3.14)

set(YOUR_PROJECT_NAME your_project)
set(YOUR_SOURCE_DIR src)
set(YOUR_SOURCE ${YOUR_SOURCE_DIR}/main.cpp)
set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(YOUR_PROJECT_VERSION 0.1)
set(YOUR_LIBRARY_NAME your_project)
set(YOUR_BINARY_NAME your_project-bin)

project(
  ${YOUR_PROJECT_NAME}
  VERSION ${YOUR_PROJECT_VERSION}
  DESCRIPTION "Your project description"
  LANGUAGES CXX)
```

- Primeiro definimos a versão mínima para rodar o cmake.

- Essa seção de `set` é um pouco opcional mas eu vejo como uma boa prática pois evita de ficar reescrevendo valores em outros arquivos como este, e vamos ter mais de um arquivo `CMakeLists.txt`. 
    - Além dessas váriaveis como nome do projeto ou diretório do código-fonte, existem alguns que são palavras-chave do CMake, como: `CMAKE_CXX_STANDARD` que diz quão ISO ele vai usar para compilar o projeto, e o `CMAKE_CXX_STANDARD_REQUIRED` que vai se auto explica.

- Essa função project monta os dados base do seu projeto, utilizando os `set` anteriores para construir váriaveis importantes no CMake como `PROJECT_NAME`.

## Criando executáveis
Em projetos C++ é muito comum termos executáveis e com isso podemos dizer para o CMake como queremos que ele seja montado e com quais bibliotecas queremos que ele seja feito o link.

```cmake
add_executable(${YOUR_BINARY_NAME} src/main.cpp)

target_link_libraries(${YOUR_BINARY_NAME} PUBLIC ${YOUR_LIBRARY_NAME})

add_directory(src)
```

- Essa função `add_executable` é bem simples de entender, ela recebe o nome do executável e qual é o arquivo responsável.
    -  Caso queira mais de um executáveis, apenas chame essa função com o nome de outro executável e seu respectivo arquivo `.cpp`

- A função `target_link_libraries` linka seu executável com a sua biblioteca.
    - No meu caso eu mantenho como padrão ter uma biblioteca _core_ na qual ela terá as dependencias corretas.

- A função `add_directory` adiciona o diretório `src` para a instrução de compilação dizendo que queremos ler o arquivo `CMakeLists.txt` dessa pasta.

## Biblioteca

Como disse um pouco acima, normalmente eu crio uma biblioteca _core_ para que ela seja a responsável de organizar meu código enquanto o `main.cpp` é responsável por usar esse código.Com isso temos agora duas pastas, uma pasta `src` que vai ter a implementação do seu projeto, e uma pasta `include` onde vai ter seus arquivos _header_:
```txt
~/your_project

├── CMakeLists.txt
├── include/
│   └── your_library/
├── src/
│   ├── CMakeLists.txt
│   ├── your_library_impl/
│   └── main.cpp
```

Na pasta `src` vai conter o arquivo de instruções com esse modelo:

```cmake
file(GLOB HEADER_LIST
  CONFIGURE_DEPENDS "${PROJECT_SOURCE_DIR}/include/**/*.hpp")
file(GLOB SOURCE_LIST "${PROJECT_SOURCE_DIR}/src/**/*.cpp")

add_library(${YOUR_LIBRARY_NAME} ${SOURCE_LIST} ${HEADER_LIST})
target_include_directories(${YOUR_LIBRARY_NAME} PUBLIC ../include)
```

Na primeira parte onde é chamado as funções `file`, é gerado uma lista de arquivos e armazenado nas respectivas variáveis `HEADER_LIST` e `SOURCE_LIST`. 

A função `add_library` pega essas listas e linka com a sua biblioteca. Em seguida as funções de target vai incluir o diretório `include` (que são seus headers).

### FetchContent e seu milagroso gerenciador de dependências

Uma das maiores dúvidas em projetos C++ modernos é que ele não vem com gerenciadores de pacotes/dependências como `cargo` para Rust, `pip` para Python ou poder instalar posteriormente como o `composer` para PHP.

Com isso a comunidade do C++ tem uma forma máis fácil de organizar isso: "Apenas baixe a biblioteca e aponte no seu código", porém isso fica um pouco inviável se a base de código tem muitas dependências. Então o CMake tem uma função perfeita pra isso chamada [FetchContent](https://cmake.org/cmake/help/latest/module/FetchContent.html) na qual você só precisa adicionar o nome da biblioteca, o repositório dela e a tag.

Um exemplo com a lib argparse:
```cmake
FetchContent_Declare(
  argparse
  GIT_REPOSITORY https://github.com/p-ranav/argparse.git
  GIT_TAG v3.0
)

FetchContent_MakeAvailable(argparse)
```

Em seguida você só precisa linkar o target da sua biblioteca com a dependência instalada:

```cmake
target_link_libraries(${YOUR_LIBRARY_NAME} argparse::argparse)
```

### Testes
Obviamente CMake suporta testes com o comando `ctest` e a forma de configurar os testes segue o mesmo padrão. Uma pasta de testes e um `CMakeLists.txt` para as instruções de como compilar seus testes.

```cmake
file(GLOB TEST_LIST "${CMAKE_CURRENT_SOURCE_DIR}/*.cpp")

FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG v1.14.0
)

FetchContent_MakeAvailable(googletest)
```

Da mesma forma que os arquivos header foram colocados numa lista, os arquivos de testes são uma lista de arquivos `.cpp` dentro da pasta de testes.

Aqui eu optei pelo googletest, que é um framework de testes unitários. É bem simples de usar e você pode encontrar mais detalhes na [documentação](https://google.github.io/googletest/) do framework.

Depois de usar o `FetchContent` para disponibilizar o framework de testes, é necessário linkar com os testes que irão ser executados. Para isso seguimos com a mesma instrução porém adicionando um executável `tests`.

```cmake
add_executable(tests ${TEST_LIST})
target_link_libraries(tests PRIVATE ${YOUR_LIBRARY_NAME} GTest::gtest_main)
add_test(NAME tests COMMAND tests WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})

include(GoogleTest)
```

Note que foi adicionado uma função `add_test` direcionando qual o comando/executavel precisa ser executado e qual o diretório de trabalho atual (para os casos que o projeto possua fixtures ou arquivos de testes). A função de `include` carrega os arquivos CMake internos do framework googletest.

### Dicas
Uma dica muito interessante é adicionar um POST BUILD para seu projeto, na qual ele vai certificar que tudo que todo seu código está em funcionamento. A comunidade C++ trata os testes como uma parte do projeto, pra term a máxima confiança que suas funcionalidades estão corretas e funcionais. Pra isso você precisa adicionar uma função `add_custom_command` do tipo `POST_BUILD`.

```cmake
add_custom_command(
    TARGET tests
    POST_BUILD
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
    COMMENT "Running tests..."
)
```
Isso fará com que toda vez que você fazer o build do seu projeto ela vai rodar os testes em seguida, assim seus testes só irão rodar se seu build passar, e como é um POST_BUILD, os seus testes fazem parte do build, logo caso falhem, seu build é falho também.

## Makefile, automatizando tudo
Para finalizar uma boa prática é usar o Makefile para não ter que ficar rodando o CMake toda vez, pra isso crie um arquivo `Makefile`, e seu projeto deve estar com essa aparência:

```txt
~/your_project
├── CMakeLists.txt
├── Makefile
├── include/
│   └── your_library/
├── src/
│   ├── CMakeLists.txt
│   └── main.cpp
└── tests
    ├── CMakeLists.txt
    └── your_test.cpp
```

Se você não sabe como funciona um Makefile, é bem simples, você precisa de uma "ação" e definir qual os comandos que ela precisa executar. Pra saber mais só dar uma olhada nesse [tutorial](https://makefiletutorial.com), é bem explicativo.

Um exemplo de como esse projeto usaria um Makefile:
```Makefile
TARGET = your_project
BUILDDIR = build

run: $(BUILDDIR)/Makefile
	@cd $(BUILDDIR) && ./$(TARGET)

test: $(BUILDDIR)/Makefile
	@cd $(BUILDDIR) && ctest --output-on-failure --gtest_catch_exceptions=0

build: $(BUILDDIR)/Makefile
	@$(MAKE) -C $(BUILDDIR)

$(BUILDDIR)/Makefile:
	@mkdir -p $(BUILDDIR)
	@cd $(BUILDDIR) && cmake ..

clean:
	@$(MAKE) -C $(BUILDDIR) clean
	@rm -rf $(BUILDDIR)
```

Depois de declarar algumas váriaveis que serão utilizadas, temos alguns comandos como run, test e build. Sabendo disso alguns desses comandos dependem do `build`, pois sem ele nada seria compilado e poderíamos testar ou rodar nosso binário.

Nota-se que o `$(BUILDDIR)/Makefile` é um comando também, que gera a pasta build e roda o CMake para gerar o esqueleto do diretório de build, e criar o Makefile padão do CMake, que é o arquivo gerado automaticamente pela ferramenta baseada nas instruções do `CMakeLists.txt`. Com isso é possível usar esse comando como pré-requisito para os outros, dando assim uma autonomia para o comando `run` por exemplo, rodar antes de tudo um build.

Esses pré-requesitos também faz com que só permita executar o comando desejado caso tiver alguma alteração no Makefile gerado pelo CMake.

## Conclusão
Com tudo montado você terá um projeto base com um dos build system mais usado no mercado, com direito a build baseado em testes unitários. Essa base é usada pelo projeto de [banco de dados para logs](/articles/armazen-part-1) que estou criando. 

Até a próxima! O ṣeun 👋
