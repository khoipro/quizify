var simpleQuiz = SimpleQuiz = [
    {
        id: 1,
        content: 'True or false? Dogs are herbivores.',
        weight: 5,
        answer_limit: null,
        answers: [
            {
                id: 1,
                content: 'False, they are omnivores.',
                is_correct: true
            },
            {
                id: 2,
                content: 'True, they are herbivores.',
                is_correct: false
            }
        ]
    },
    {
        id: 2,
        content: 'What is the chemical symbol for the element oxygen?',
        weight: 5,
        answer_limit: 6,
        answers: [
            {
                id: 3,
                content: 'Ox',
                is_correct: false
            },
            {
                id: 4,
                content: 'O',
                is_correct: true
            },
            {
                id: 5,
                content: 'Oxy',
                is_correct: false
            },
            {
                id: 6,
                content: 'N',
                is_correct: false
            },
            {
                id: 15,
                content: 'o2',
                is_correct: false
            },
            {
                id: 16,
                content: 'o+',
                is_correct: false
            }

        ]
    },
    {
        id: 3,
        content: 'Pure water has a pH level of a around?',
        weight: 5,
        answer_limit: null,
        answers: [
            {
                id: 7,
                content: '8',
                is_correct: false
            },
            {
                id: 8,
                content: '2',
                is_correct: false
            },
            {
                id: 9,
                content: '7',
                is_correct: true
            },
            {
                id: 10,
                content: '12',
                is_correct: false
            }
        ]
    },
    {
        id: 4,
        content: 'Which of the following are common names?',
        weight: 5,
        answer_limit: null,
        answers: [
            {
                id: 11,
                content: 'Jack',
                is_correct: true
            },
            {
                id: 12,
                content: 'John',
                is_correct: true
            },
            {
                id: 13,
                content: 'XenuTheDestroyer1213',
                is_correct: false
            },
            {
                id: 14,
                content: 'XenuTheDestroyer1212',
                is_correct: false
            }
        ]
    }
];

document.addEventListener('DOMContentLoaded', function () {
    var quizContainer = document.getElementById('quizContainer');

    var quiz = new quizify(simpleQuiz, {
        questionNextButtonClass: 'pure-button pure-button-primary'
    });

    quiz.addEventListener('answerSelected', handleQuizMoveToNext);

    function handleQuizMoveToNext() {
        var question = quiz.getNext();

        // remove all childrenin container
        while (quizContainer.hasChildNodes()) {
            quizContainer.removeChild(quizContainer.lastChild);
        }

        if (question.type === 'question')
            quizContainer.appendChild(question.data.dom_node);
        else if (question.type === 'result'){
            console.log(question);
            quizContainer.appendChild(question.data.dom_node);
        }
            
    }

    // call once on startup
    handleQuizMoveToNext();



});