import { Question, QuestionSet } from "nest-commander";

@QuestionSet({ name: "create-user-questions" })
export class CreateUserQuestion {
  @Question({
    message: "Enter name",
    name: "name",
  })
  name(val: string) {
    return val;
  }

  @Question({ message: "enter email", name: "email" })
  parseEmail(val: string) {
    return val;
  }

  @Question({
    message: "enter password",
    name: "password",
    mask: "*",
    type: "password",
  })
  parsePassword(val: string) {
    return val;
  }
}
