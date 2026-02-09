# Lumina ✦

**선언적 UI와 반응형 상태를 언어 수준에서 지원하는 프론트엔드 프로그래밍 언어**

```lumina
component Counter() {
  state count = 0

  fn increment() {
    count = count + 1
  }

  <div style={({ textAlign: "center", padding: "40px" })}>
    <p style={({ fontSize: "64px", color: "#4F46E5" })}>{count}</p>
    <button @click={increment}>"+"</button>
  </div>
}
```

---

## Why Lumina?

현대 프론트엔드 개발은 HTML, CSS, JavaScript라는 세 가지 언어를 동시에 다뤄야 합니다. React, Vue 같은 프레임워크가 이 간극을 줄여주었지만, 본질적으로 JavaScript 위에 얹힌 라이브러리일 뿐입니다.

Lumina는 다른 접근을 합니다. **UI, 상태, 스타일을 하나의 언어 문법으로 통합**하여 프론트엔드 개발의 본질에 집중합니다.

## Philosophy

Lumina의 설계 철학은 세 가지 원칙에 기반합니다.

### 1. UI는 1급 시민이다
UI 요소가 별도의 라이브러리 호출이 아니라 언어 문법 자체입니다. `<div>`, `<button>` 같은 요소를 함수 호출처럼 자연스럽게 작성합니다. JSX가 JavaScript에 얹힌 것이라면, Lumina에서 UI는 언어 그 자체입니다.

### 2. 상태 변화는 선언적이어야 한다
`state` 키워드로 선언된 변수는 변경 시 관련 UI를 자동으로 업데이트합니다. `setState`, `useState`, `ref()` 같은 프레임워크 API 없이 단순한 할당(`count = count + 1`)만으로 반응형 업데이트가 일어납니다.

### 3. 단순함이 강력함이다
하나의 `.lum` 파일이 하나의 완전한 컴포넌트입니다. 별도의 CSS 파일, 별도의 상태 관리 라이브러리, 복잡한 빌드 설정이 필요 없습니다. 트랜스파일러 하나로 브라우저에서 바로 실행되는 HTML을 생성합니다.

## Features

### 핵심 기능
- **`component`** — 컴포넌트 선언 (파라미터, 기본값 지원)
- **`state`** — 반응형 상태 (값 변경 시 자동 리렌더링)
- **선언적 UI** — HTML-like 문법이 언어에 내장
- **`@event` 바인딩** — `@click={handler}` 형태의 이벤트 핸들링
- **`{expression}`** — UI 내 동적 표현식 삽입
- **조건부/반복 렌더링** — `{if ...}`, `{for item in items}`
- **`style` 선언** — CSS를 언어 수준에서 관리
- **`|>` 파이프 연산자** — 함수형 데이터 변환 체이닝
- **`effect`** — 사이드 이펙트 생명주기 관리
- **Kotlin/Swift 스타일 문법** — 타입 추론, 세미콜론 생략, 간결한 표현

### 🆕 최근 추가된 기능

#### 1. 컴포넌트 Props 전달 및 중첩 렌더링
컴포넌트를 재사용 가능한 빌딩 블록으로 구성할 수 있습니다.

```lumina
component Button(text: String, color: String, onClick) {
  <button @click={onClick} style={({ background: color })}>
    {text}
  </button>
}

component App() {
  state count = 0
  fn increment() { count = count + 1 }

  <div>
    <Button text="+" color="#10B981" onClick={increment} />
  </div>
}
```

#### 2. 정적 타입 체크
컴파일 시 타입 안전성을 보장합니다.

```bash
# 타입 체크와 함께 컴파일
lumina app.lum --typecheck -o app.html
```

```lumina
component TypedButton(text: String, count: Int, onClick) {
  <button @click={onClick}>{text}" ("{count}")"</button>
}

// 타입 에러 예시
state count: Int = "not a number"  // ❌ Type Error!
```

지원 타입: `Int`, `String`, `Bool`, `Array`, `Object`, `Function`

#### 3. 모듈 시스템 (Export)
컴포넌트와 함수를 export하여 재사용할 수 있습니다.

```lumina
export component Button(text, onClick) {
  <button @click={onClick}>{text}</button>
}

export component Card(title, content) {
  <div>
    <h3>{title}</h3>
    <p>{content}</p>
  </div>
}
```

Export된 컴포넌트는 `window` 객체에 등록되어 다른 스크립트에서 사용 가능합니다.

## Quick Start

```bash
# 프로젝트 클론
git clone https://github.com/Richard-JHLee/lumina.git
cd lumina

# 의존성 설치
npm install

# 예제 컴파일
npx ts-node --transpile-only src/bin/lumina.ts examples/counter.lum -o output/counter.html

# 브라우저에서 열기
open output/counter.html
```

## Examples

### Counter

```lumina
component Counter() {
  state count = 0

  fn increment() { count = count + 1 }
  fn decrement() { count = count - 1 }

  <div>
    <p>{count}</p>
    <button @click={decrement}>"-"</button>
    <button @click={increment}>"+"</button>
  </div>
}
```

### Todo App

```lumina
component TodoApp() {
  state todos = []
  state inputValue = ""

  fn addTodo() {
    if inputValue != "" {
      todos = todos.concat([{ text: inputValue, done: false }])
      inputValue = ""
    }
  }

  <div>
    <input type="text" value={inputValue} />
    <button @click={addTodo}>"Add"</button>
    <div>
      {for todo in todos {
        <div>
          <span>{todo.text}</span>
        </div>
      }}
    </div>
  </div>
}
```

### Style Declarations

```lumina
style card {
  padding: 24,
  borderRadius: 12,
  background: "white",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
}

component Card() {
  <div class="lumina-card">
    <h2>"Hello Lumina"</h2>
  </div>
}
```

## Architecture

```
Source (.lum)  →  Lexer  →  Tokens  →  Parser  →  AST  →  CodeGen  →  HTML/JS/CSS
```

| Module | Role |
|--------|------|
| `src/lexer` | 소스 코드를 토큰으로 분리 |
| `src/parser` | 토큰을 AST(추상 구문 트리)로 변환 |
| `src/codegen` | AST를 JavaScript/HTML/CSS로 트랜스파일 |
| `src/types.ts` | Token, AST 노드 타입 정의 |
| `src/bin/lumina.ts` | CLI 엔트리포인트 |

## CLI Usage

```bash
lumina <file.lum>                      # 컴파일 후 stdout 출력
lumina <file.lum> -o out.html          # 파일로 저장
lumina <file.lum> --typecheck          # 타입 체크 실행
lumina <file.lum> --typecheck -o out   # 타입 체크 + 컴파일
lumina <file.lum> --ast                # AST 출력 (디버그)
lumina <file.lum> --tokens             # 토큰 출력 (디버그)
lumina <file.lum> --js-only            # JavaScript만 출력
lumina <file.lum> --css-only           # CSS만 출력
```

## Roadmap

- [x] 컴포넌트 간 Props 전달 및 중첩 컴포넌트 렌더링
- [x] 타입 시스템 (정적 타입 체크)
- [x] 모듈 시스템 (`export` 지원, `import`는 추후 빌드 시스템과 함께 구현 예정)
- [ ] 가상 DOM 또는 Incremental DOM 기반 효율적 렌더링
- [ ] Dev Server (Hot Module Replacement)
- [ ] VS Code / IDE 확장 (문법 하이라이팅, 자동완성)
- [ ] 서버사이드 렌더링 (SSR)
- [ ] 패키지 매니저 연동

## Contributing

Lumina는 초기 프로토타입 단계입니다. 모든 형태의 기여를 환영합니다.

1. Fork → Branch → PR
2. 이슈로 버그 리포트나 기능 제안
3. 언어 설계에 대한 토론 (Discussions 탭)

## License

MIT License — 자유롭게 사용, 수정, 배포할 수 있습니다.
