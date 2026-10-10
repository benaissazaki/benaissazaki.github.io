---
title: 6 Django Tips to go From Beginner to Intermediate
date: 2024-02-02T12:00:00Z
emoji: "🍡"
description: Essential tips to go from being a Beginner in the Django framework to an Intermediate
---

Ah Django! My first backend framework and still my favorite.

I still remember learning it in 2020 during Covid lockdown to use it for my License project. And because of its simplicity, good organization, and speed of delivery it's been my go-to framework since then and I have used it on numerous projects.

As I was recently cleaning up my Github, I came across some of my old Django code, and I am glad of the progress I made (that's a euphemism to say that it was garbage).

So I took note of the things that I did wrong, compiled with some observations from other beginner codebases found on Github here and there, and I came up with these tips on how to go from being a total beginner at Django, to being able to produce noticeably better code.

## Use a virtual environment for each project

By default, you might be using the global python installation for every project on your computer, however this can cause a lot of issues.

Maybe Project A works with your current version of Python but Project B doesn't? Or maybe Project A requires a certain version of Django and project B requires another?

Thankfully, there are tools that allow you to isolate each project in a virtual environment. Meaning each project will have its own python installation and its own libraries.

There are multiple ways do so, but my favorite ones are [pipenv](https://pipenv.pypa.io/en/latest/) and [poetry](https://python-poetry.org/). Their workflow is very similar to something like `npm` for NodeJS or `cargo` for Rust.

## Separate configuration into environment variables

Naturally, your local computer on which you develop your app, and the production server that will run it are two different environments.

So it is necessary to extract environment-dependent settings into environment variables so that they can be adapted without changing the source code.

[django-environ](https://django-environ.readthedocs.io/en/latest/) is the simplest way to achieve this

Environment-dependent settings include:
- Database configuration
- SECRET_KEY
- DEBUG
- API keys for 3rd party tools
- ... etc

## Use generic views when possible

To quote the [Django documentation](https://docs.djangoproject.com/en/5.0/topics/class-based-views/generic-display/):

> Writing web applications can be monotonous, because we repeat certain patterns again and again. Django tries to take away some of that monotony at the model and template layers, but web developers also experience this boredom at the view level.
>
> Django’s generic views were developed to ease that pain. They take certain common idioms and patterns found in view development and abstract them so that you can quickly write common views of data without having to write too much code.

### Example:
You want to create a view that displays your blog posts.

Without generic views, you would create a view function that will fetch the blog posts from the Database, setup custom logic for pagination, add the option to filter by the blog post's category...etc. You will end up with a messy code.

Here's how it would look like with a generic view:

    from django.views.generic.list import ListView
    from .models import BlogPost

    class BlogPostListView(ListView):
      model = BlogPost
      paginate_by = 10
      template_name = "blog/blog_post_list.html"
      context_object_name = "blog_posts"

And that's it! In your template (`blog/blog_post_list.html` in this case) you can access the `blog_posts` object whose content dynamically adapts to the current page and additional filtering that you want to add.

## A model should encapsulate its own logic
All operations on a specific model should be encapsulated within that model's class.

### Example:
Say you have a `Product` model, and you need to calculate its discounted price on multiple occasions. 

A common mistake among beginners is to calculate it within multiple views, which creates redundancy.

The best way to do it, is to create a method within the model's class:

    class Product(models.Model):
      ...
      def get_discounted_price(self):
        ...

This way, all of the logic is encapsulated in the Model, which makes it easier to modify and allows for looser coupling between yout views and models.


## One App, One concern

If your Django project is just one giant app that handles everything, you are doing it wrong.

It is better to have multiple loosely-coupled apps, with each one dealing with a specific concern.

This will make your codebase much more readable and maintainable.

## Create abstract models for common logic across models
Let's say you want to audit the time at which a BlogPost has been last modified and the user whom updated it. You might do something like this:

    class BlogPost(models.Model):
      ...
      last_modified = models.DateTimeField(auto_now=True)
      last_modified_by = models.ForeignKey(User,
                            on_delete=models.SET_NULL,
                            blank=True,
                            null=True)
      ...

Good! But now let's say you need the same functionality for 4 other models? You will end up with a lot of redundancy and any modification will have to be done in several places.

A great way to address this problem, is to extract logic common across multiple models into an abstract model, which will be inherited by your models:

    class AuditModel(models.Model):
      last_modified = models.DateTimeField(auto_now=True)
      last_modified_by = models.ForeignKey(User,
                            on_delete=models.SET_NULL,
                            blank=True,
                            null=True)
      class Meta:
        abstract = True


    class BlogPost(AuditModel):
      ...

    class Category(AuditModel):
      ...

[More info on Abstract models here](https://docs.djangoproject.com/en/5.0/topics/db/models/#abstract-base-classes)

## Conclusion

The End!
