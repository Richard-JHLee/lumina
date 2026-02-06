# Lumina Language Specification v0.1

## Overview
Lumina는 **선언적 UI와 반응형 상태 관리**를 언어 수준에서 지원하는 프론트엔드 전용 언어입니다.
`.lum` 파일을 작성하면 트랜스파일러가 **HTML/JS/CSS**로 변환합니다.

## Quick Start

```bash
# 컴파일
npx ts-node --transpile-only src/bin/lumina.ts examples/counter.lum -o output/counter.html

# 브라우저에서 열기
open output/counter.html
```

---

## 1. Variables

```lumina
let name = "Lumina"       // 불변
var count = 0             // 가변
let typed: Int = 42       // 타입 어노테이션 (선택)
```

## 2. Functions

```lumina
fn add(a: Int, b: Int) -> Int {
  return a + b
}

// 화살표 함수
let double = (x) => x * 2
let greet = name => "Hello " + name
```

## 3. Components (핵심 기능)

컴포넌트는 UI를 캡슐화하는 단위입니다.

```lumina
component Counter(initial: Int = 0) {
  // 반응형 상태 - 변경 시 자동 리렌더링
  state count = initial

  // 메서드
  fn increment() {
    count = count + 1
  }

  fn decrement() {
    count = count - 1
  }

  // 선언적 UI (JSX-like)
  <div style={({ textAlign: "center", padding: "20px" })}>
    <h1>"Counter"</h1>
    <p style={({ fontSize: "48px" })}>{count}</p>
    <button @click={decrement}>"-"</button>
    <button @click={increment}>"+"</button>
  </div>
}
```

## 4. Reactive State

`state` 키워드로 선언된 변수는 반응형입니다.
값이 변경되면 컴포넌트가 자동으로 리렌더링됩니다.

```lumina
state todos = []
state filter = "all"

// 값 변경 시 UI 자동 업데이트
todos = todos.concat([{ text: "New", done: false }])
```

## 5. UI Elements

HTML과 유사하지만 Lumina 문법 안에 통합되어 있습니다.

```lumina
// 기본 요소
<div class="container">
  <h1>"Hello World"</h1>
</div>

// 셀프 클로징
<input type="text" placeholder="Enter..." />

// 동적 표현식
<span>{user.name}</span>

// 인라인 스타일 (객체)
<div style={({ color: "red", fontSize: "16px" })}>
  "Styled text"
</div>

// 이벤트 핸들링 (@event 문법)
<button @click={handleClick}>"Click me"</button>

// 조건부 렌더링
{if isVisible {
  <div>"Visible!"</div>
}}

// 리스트 렌더링
{for item in items {
  <li>{item.name}</li>
}}
```

## 6. Event Handlers

`@` 접두사로 DOM 이벤트를 바인딩합니다.

```lumina
<button @click={onClick}>"Click"</button>
<input @input={onInput} @keydown={onKeyDown} />
<div @mouseenter={onHover}>"Hover me"</div>
```

## 7. Style Declarations

컴포넌트 외부에서 재사용 가능한 스타일을 정의합니다.

```lumina
style buttonStyle {
  padding: 12,                    // 숫자 -> px 자동 변환
  borderRadius: 8,
  background: "#4F46E5",
  color: "white",
  border: "none",
  cursor: "pointer"
}

// 사용
<button class="lumina-buttonStyle">"Styled"</button>
```

## 8. Effects

사이드 이펙트를 선언합니다.

```lumina
effect(count) {
  console.log("Count changed: " + count)
}

effect {
  // 마운트 시 한 번 실행
  console.log("Component mounted")
}
```

## 9. Control Flow

```lumina
if x > 10 {
  // ...
} else if x > 5 {
  // ...
} else {
  // ...
}

for item in list {
  console.log(item)
}
```

## 10. Pipe Operator

함수형 프로그래밍 스타일의 파이프 연산자입니다.

```lumina
let result = data |> transform |> render
// 위는 render(transform(data)) 와 동일
```

## 11. Comments

```lumina
// 한 줄 주석
/* 여러 줄
   주석 */
```

---

## File Structure

```
lumina-lang/
  src/
    types.ts          # Token, AST 타입 정의
    lexer/index.ts    # 토크나이저
    parser/index.ts   # AST 파서
    codegen/index.ts  # JS/HTML/CSS 코드 생성기
    index.ts          # 컴파일러 메인 엔트리
    bin/lumina.ts     # CLI 도구
  examples/
    counter.lum       # 카운터 예제
    todo-app.lum      # 투두 앱 예제
  output/             # 컴파일된 HTML 출력
```

## CLI Usage

```bash
lumina <file.lum>              # 컴파일 후 stdout 출력
lumina <file.lum> -o out.html  # 파일로 출력
lumina <file.lum> --ast        # AST 디버그 출력
lumina <file.lum> --tokens     # 토큰 디버그 출력
lumina <file.lum> --js-only    # JS만 출력
lumina <file.lum> --css-only   # CSS만 출력
```
